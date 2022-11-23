use std::{
	fs::File,
	io::{BufRead, BufReader},
	path::{Path, PathBuf},
};

use globset::{Glob, GlobSetBuilder};
use prisma_client_rust::{raw, PrismaValue, QueryError};
use tracing::{debug, error, trace};
use walkdir::DirEntry;

use crate::{
	db::{
		models::{LibraryOptions, Media, MediaBuilder, MediaBuilderOptions},
		Dao, DaoBatch, MediaDaoImpl,
	},
	fs::{image, media_file, scanner::BatchScanOperation},
	prelude::{CoreResult, Ctx, FileStatus},
	prisma::{library, media, series},
};

impl MediaBuilder for Media {
	fn build(path: &Path, series_id: &str) -> CoreResult<Media> {
		Media::build_with_options(
			path,
			MediaBuilderOptions {
				series_id: series_id.to_string(),
				..Default::default()
			},
		)
	}

	fn build_with_options(
		path: &Path,
		options: MediaBuilderOptions,
	) -> CoreResult<Media> {
		let processed_entry = media_file::process(path, &options.library_options)?;

		let pathbuf = processed_entry.path;
		let path = pathbuf.as_path();

		let path_str = path.to_str().unwrap_or_default().to_string();

		let name = path
			.file_stem()
			.unwrap_or_default()
			.to_str()
			.unwrap_or_default()
			.to_string();

		let ext = path
			.extension()
			.unwrap_or_default()
			.to_str()
			.unwrap_or_default()
			.to_string();

		// Note: make this return a tuple if I need to grab anything else from metadata.
		let size = match path.metadata() {
			Ok(metadata) => metadata.len(),
			_ => 0,
		};

		let comic_info = processed_entry.metadata.unwrap_or_default();

		Ok(Media {
			name,
			description: comic_info.summary,
			size: size.try_into().unwrap_or_else(|e| {
				error!("Failed to calculate file size: {:?}", e);

				0
			}),
			extension: ext,
			pages: match comic_info.page_count {
				Some(count) => count as i32,
				None => processed_entry.pages,
			},
			checksum: processed_entry.checksum,
			path: path_str,
			series_id: options.series_id,
			..Default::default()
		})
	}
}

/// Will mark all series and media within the library as MISSING. Requires the
/// series and series.media relations to have been loaded to function properly.
pub async fn mark_library_missing(library: library::Data, ctx: &Ctx) -> CoreResult<()> {
	let db = ctx.get_db();

	db._execute_raw(raw!(
		"UPDATE series SET status={} WHERE library_id={}",
		PrismaValue::String("MISSING".to_owned()),
		PrismaValue::String(library.id.clone())
	))
	.exec()
	.await?;

	let media_query = format!(
		"UPDATE media SET status\"{}\" WHERE seriesId in ({})",
		"MISSING".to_owned(),
		library
			.series()
			.unwrap_or(&vec![])
			.iter()
			.cloned()
			.map(|s| format!("\"{}\"", s.id))
			.collect::<Vec<_>>()
			.join(",")
	);

	db._execute_raw(raw!(&media_query)).exec().await?;

	Ok(())
}

pub async fn insert_media(
	ctx: &Ctx,
	path: &Path,
	series_id: String,
	library_options: &LibraryOptions,
) -> CoreResult<Media> {
	let path_str = path.to_str().unwrap_or_default().to_string();
	let media_dao = MediaDaoImpl::new(ctx.db.clone());
	let media = Media::build_with_options(
		path,
		MediaBuilderOptions {
			series_id,
			library_options: library_options.clone(),
		},
	)?;
	let created_media = media_dao.insert(media).await?;

	trace!("Media entity created: {:?}", created_media);

	if library_options.create_webp_thumbnails {
		debug!("Attempting to create WEBP thumbnail");
		let thumbnail_path = image::generate_thumbnail(&created_media.id, &path_str)?;
		debug!("Created WEBP thumbnail: {:?}", thumbnail_path);
	}

	debug!("Media for {} created successfully", path_str);

	Ok(created_media)
}

pub async fn insert_series_batch(
	ctx: &Ctx,
	entries: Vec<DirEntry>,
	library_id: String,
) -> CoreResult<Vec<series::Data>> {
	let series_creates = entries.into_iter().map(|entry| {
		let path = entry.path();

		// TODO: figure out how to do this in the safest way possible...
		let name = path
			.file_name()
			.unwrap_or_default()
			.to_str()
			.unwrap_or_default()
			.to_string();

		// TODO: change this to a Result, then filter map on the iterator and
		// log the Err values...
		ctx.db.series().create(
			name,
			path.to_str().unwrap_or_default().to_string(),
			vec![series::library::connect(library::id::equals(
				library_id.clone(),
			))],
		)
	});

	let inserted_series = ctx.db._batch(series_creates).await?;

	Ok(inserted_series)
}

pub async fn mark_media_missing(
	ctx: &Ctx,
	paths: Vec<String>,
) -> Result<i64, QueryError> {
	let db = ctx.get_db();

	db.media()
		.update_many(
			vec![media::path::in_vec(paths)],
			vec![media::status::set(FileStatus::Missing.to_string())],
		)
		.exec()
		.await
}

pub async fn batch_media_operations(
	ctx: &Ctx,
	operations: Vec<BatchScanOperation>,
	library_options: &LibraryOptions,
) -> CoreResult<Vec<Media>> {
	let media_dao = MediaDaoImpl::new(ctx.db.clone());
	// Note: this won't work if I add any other operations...
	let (create_operations, mark_missing_operations): (Vec<_>, Vec<_>) =
		operations.into_iter().partition(|operation| {
			matches!(operation, BatchScanOperation::CreateMedia { .. })
		});

	let media_creates = create_operations
		.into_iter()
		.map(|operation| match operation {
			BatchScanOperation::CreateMedia { path, series_id } => {
				Media::build_with_options(
					&path,
					MediaBuilderOptions {
						series_id,
						library_options: library_options.clone(),
					},
				)
			},
			_ => unreachable!(),
		})
		.filter_map(|res| match res {
			Ok(entry) => Some(entry),
			Err(e) => {
				error!("Failed to create media: {:?}", e);

				None
			},
		});

	let missing_paths = mark_missing_operations
		.into_iter()
		.map(|operation| match operation {
			BatchScanOperation::MarkMediaMissing { path } => path,
			_ => unreachable!(),
		})
		.collect::<Vec<String>>();

	let _result = mark_media_missing(ctx, missing_paths).await;

	media_dao._insert_batch(media_creates).await
}

// TODO: error handling, i.e don't unwrap lol
// TODO: is it better practice to make this async?
pub fn populate_glob_builder(builder: &mut GlobSetBuilder, paths: &[PathBuf]) {
	for path in paths {
		// read the lines of the file, and add each line as a glob pattern in the builder
		let file = File::open(path).unwrap();

		for line in BufReader::new(file).lines() {
			if let Err(e) = line {
				error!("Failed to read line from file: {:?}", e);
				continue;
			}

			builder.add(Glob::new(&line.unwrap()).unwrap());
		}
	}
}
