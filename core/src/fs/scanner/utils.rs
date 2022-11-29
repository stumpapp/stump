use std::{
	collections::HashMap,
	fs::File,
	io::{BufRead, BufReader},
	path::{Path, PathBuf},
};

use globset::{Glob, GlobSet, GlobSetBuilder};
use itertools::Itertools;
use prisma_client_rust::{
	chrono::{DateTime, Utc},
	raw, PrismaValue, QueryError,
};
use tracing::{debug, error, trace, warn};
use walkdir::{DirEntry, WalkDir};

use crate::{
	db::{
		models::{LibraryOptions, Media, MediaBuilder, MediaBuilderOptions},
		Dao, DaoBatch, MediaDaoImpl, SeriesDao, SeriesDaoImpl,
	},
	fs::{image, media_file, scanner::BatchScanOperation},
	prelude::{CoreError, CoreResult, Ctx, FileStatus},
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

pub(crate) async fn setup_series_scan(
	ctx: &Ctx,
	series: &series::Data,
	library_path: &str,
	library_options: &LibraryOptions,
) -> (
	HashMap<String, bool>,
	HashMap<String, Media>,
	WalkDir,
	GlobSet,
) {
	let series_dao = SeriesDaoImpl::new(ctx.db.clone());
	let series_ignore_file = Path::new(series.path.as_str()).join(".stumpignore");
	let library_ignore_file = Path::new(library_path).join(".stumpignore");

	let media = series_dao
		.get_series_media(series.id.as_str())
		.await
		.unwrap_or_else(|e| {
			error!(error = ?e, "Error occurred trying to fetch media for series");
			vec![]
		});

	let mut visited_media = HashMap::with_capacity(media.len());
	let mut media_by_path = HashMap::with_capacity(media.len());
	for m in media {
		visited_media.insert(m.path.clone(), false);
		media_by_path.insert(m.path.clone(), m);
	}

	let mut walkdir = WalkDir::new(&series.path);
	let is_collection_based = library_options.is_collection_based();

	if !is_collection_based || series.path == library_path {
		walkdir = walkdir.max_depth(1);
	}

	let mut builder = GlobSetBuilder::new();
	if series_ignore_file.exists() || library_ignore_file.exists() {
		populate_glob_builder(
			&mut builder,
			vec![series_ignore_file, library_ignore_file]
				.into_iter()
				// We have to remove duplicates here otherwise the glob will double some patterns.
				// An example would be when the library has media in root. Not the end of the world.
				.unique()
				.filter(|p| p.exists())
				.collect::<Vec<_>>()
				.as_slice(),
		);
	}

	// TODO: make this an error to enforce correct glob patterns in an ignore file.
	// This way, no scan will ever add things a user wants to ignore.
	let glob_set = builder.build().unwrap_or_default();

	(visited_media, media_by_path, walkdir, glob_set)
}

pub(crate) fn file_updated_since_scan(
	entry: &DirEntry,
	last_modified_at: String,
) -> CoreResult<bool> {
	if let Ok(Ok(system_time)) = entry.metadata().map(|m| m.modified()) {
		let media_modified_at =
			last_modified_at.parse::<DateTime<Utc>>().map_err(|e| {
				error!(
					path = ?entry.path(),
					error = ?e,
					"Error occurred trying to read modified date for media",
				);

				CoreError::Unknown(e.to_string())
			})?;
		let system_time_converted: DateTime<Utc> = system_time.into();
		trace!(?system_time_converted, ?media_modified_at,);

		if system_time_converted > media_modified_at {
			return Ok(true);
		}

		Ok(false)
	} else {
		error!(
			path = ?entry.path(),
			"Error occurred trying to read modified date for media",
		);

		Ok(true)
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
	let series_creates = entries
		.into_iter()
		.map(|entry| {
			let path = entry.path();

			let file_name = path
				.file_name()
				.and_then(|file_name| file_name.to_str().map(String::from));
			let path_str = path.to_str().map(String::from);

			debug!(
				file_name,
				path_str, "Parsing series name and path from file"
			);

			(file_name, path_str)
		})
		.filter_map(|result| match result {
			(Some(file_name), Some(path_str)) => Some(ctx.db.series().create(
				file_name,
				path_str,
				vec![series::library::connect(library::id::equals(
					library_id.clone(),
				))],
			)),
			_ => None,
		});

	Ok(ctx.db._batch(series_creates).await?)
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

	let (media_creates, media_updates, missing_paths) =
		operations
			.into_iter()
			.fold(
				(vec![], vec![], vec![]),
				|mut acc, operation| match operation {
					BatchScanOperation::CreateMedia { path, series_id } => {
						let build_result = Media::build_with_options(
							&path,
							MediaBuilderOptions {
								series_id,
								library_options: library_options.clone(),
							},
						);

						if let Ok(media) = build_result {
							acc.0.push(media);
						} else {
							error!(
								?build_result,
								"Error occurred trying to build media entity",
							);
						}

						acc
					},
					BatchScanOperation::UpdateMedia(outdated_media) => {
						// TODO: do something with media_updates
						warn!(
							?outdated_media,
							"Stump does not support updating media entities yet",
						);
						acc.1.push(outdated_media);
						// let build_result = Media::build_with_options(
						// 	Path::new(&outdated_media.path),
						// 	MediaBuilderOptions {
						// 		series_id: outdated_media.series_id.clone(),
						// 		library_options: library_options.clone(),
						// 	},
						// );

						// if let Ok(patch_media) = build_result {
						// 	// outdated_media.apply_options(patch_media);
						// 	acc.0.push(patch_media);
						// } else {
						// 	error!(
						// 		?build_result,
						// 		"Error occurred trying to build media entity for update",
						// 	);
						// }

						acc
					},
					BatchScanOperation::MarkMediaMissing { path } => {
						acc.2.push(path);
						acc
					},
				},
			);

	trace!(
		media_creates_len = media_creates.len(),
		media_updates_len = media_updates.len(),
		missing_paths_len = missing_paths.len(),
		"Partitioned batch operations",
	);

	// TODO: do something with media_updates

	let marked_missing_result = mark_media_missing(ctx, missing_paths).await;
	if let Err(err) = marked_missing_result {
		error!(
			query_error = ?err,
			"Error occurred trying to mark media as missing",
		);
	}

	let inserted_media = media_dao.insert_many(media_creates).await?;
	debug!(
		inserted_media_len = inserted_media.len(),
		"Inserted new media entities",
	);

	// let updated_media = media_dao.update_many(media_updates).await?;
	// FIXME: make return generic (not literally)
	Ok(inserted_media)
}

pub fn populate_glob_builder(builder: &mut GlobSetBuilder, paths: &[PathBuf]) {
	for path in paths {
		let open_result = File::open(path);
		if let Ok(file) = open_result {
			// read the lines of the file, and add each line as a glob pattern in the builder
			for line in BufReader::new(file).lines() {
				if let Err(e) = line {
					error!(
						error = ?e,
						"Error occurred trying to read line from glob file",
					);
					continue;
				}

				builder.add(Glob::new(&line.unwrap()).unwrap());
			}
		} else {
			error!(
				error = ?open_result.err(),
				?path,
				"Failed to open file",
			);
		}
	}
}
