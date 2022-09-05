use std::path::Path;

use prisma_client_rust::{raw, PrismaValue, QueryError};
use walkdir::DirEntry;

use crate::{
	config::context::Ctx,
	event::ClientEvent,
	fs::{image, media_file},
	prisma::{library, media, series},
	types::{
		errors::{ApiError, ScanError},
		models::{
			library::LibraryOptions,
			media::{MediaMetadata, TentativeMedia},
		},
	},
};

use super::BatchScanOperation;

/// Will mark all series and media within the library as MISSING. Requires the
/// series and series.media relations to have been loaded to function properly.
pub async fn mark_library_missing(
	library: library::Data,
	ctx: &Ctx,
) -> Result<(), ApiError> {
	let db = ctx.get_db();

	db._execute_raw(raw!(
		"UPDATE series SET status={} WHERE libraryId={}",
		PrismaValue::String("MISSING".to_owned()),
		PrismaValue::String(library.id.clone())
	))
	.exec()
	.await?;

	let series_ids = library
		.series()
		.unwrap_or(&vec![])
		.to_owned()
		.into_iter()
		.map(|s| s.id.to_owned())
		.collect::<Vec<_>>();

	let media_query = format!(
		"UPDATE media SET status\"{}\" WHERE seriesId in ({})",
		"MISSING".to_owned(),
		series_ids
			.into_iter()
			.map(|id| format!("\"{}\"", id))
			.collect::<Vec<_>>()
			.join(",")
	);

	db._execute_raw(raw!(&media_query)).exec().await?;

	Ok(())
}

pub fn get_tentative_media(
	path: &Path,
	series_id: String,
	library_options: &LibraryOptions,
) -> Result<TentativeMedia, ScanError> {
	let processed_entry = media_file::process(path, library_options)?;

	let pathbuf = processed_entry.path;
	let path = pathbuf.as_path();

	let path_str = path.to_str().unwrap_or_default().to_string();

	// EW, I hate that I need to do this over and over lol time to make a trait for Path.
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

	let comic_info = processed_entry.metadata.unwrap_or(MediaMetadata::default());

	Ok(TentativeMedia {
		name,
		description: comic_info.summary,
		size: size.try_into().unwrap_or_else(|e| {
			log::error!("Failed to calculate file size: {:?}", e);

			0
		}),
		extension: ext,
		pages: match comic_info.page_count {
			Some(count) => count as i32,
			None => processed_entry.pages,
		},
		checksum: processed_entry.checksum,
		path: path_str,
		series_id,
	})

	// Ok(ctx.db.media().create(
	// 	name,
	// size.try_into().unwrap_or_else(|e| {
	// 	log::error!("Failed to calculate file size: {:?}", e);

	// 	0
	// }),
	// 	ext,
	// match comic_info.page_count {
	// 	Some(count) => count as i32,
	// 	None => processed_entry.pages,
	// },
	// 	path_str.clone(),
	// 	vec![
	// 		media::checksum::set(processed_entry.checksum),
	// 		media::description::set(comic_info.summary),
	// 		media::series::connect(series::id::equals(series_id)),
	// 	],
	// ))
}

pub async fn insert_media(
	ctx: &Ctx,
	path: &Path,
	series_id: String,
	library_options: &LibraryOptions,
) -> Result<media::Data, ScanError> {
	let path_str = path.to_str().unwrap_or_default().to_string();

	let tentative_media = get_tentative_media(path, series_id, library_options)?;
	let create_action = tentative_media.into_action(ctx);
	let media = create_action.exec().await?;

	log::trace!("Media entity created: {:?}", media);

	if library_options.create_webp_thumbnails {
		log::debug!("Attempting to create WEBP thumbnail");
		let thumbnail_path = image::generate_thumbnail(&media.id, &path_str)?;
		log::debug!("Created WEBP thumbnail: {:?}", thumbnail_path);
	}

	log::debug!("Media for {} created successfully", path_str);

	Ok(media)
}

pub async fn insert_series(
	ctx: &Ctx,
	entry: &DirEntry,
	library_id: String,
) -> Result<series::Data, ScanError> {
	let path = entry.path();

	// TODO: use this??
	// let metadata = match path.metadata() {
	// 	Ok(metadata) => Some(metadata),
	// 	_ => None,
	// };

	// TODO: change error
	let name = match path.file_name() {
		Some(name) => match name.to_str() {
			Some(name) => name.to_string(),
			_ => {
				return Err(ScanError::FileParseError(
					"Failed to get name for series".to_string(),
				))
			},
		},
		_ => {
			return Err(ScanError::FileParseError(
				"Failed to get name for series".to_string(),
			))
		},
	};

	let series = ctx
		.db
		.series()
		.create(
			name,
			path.to_str().unwrap().to_string(),
			vec![series::library::connect(library::id::equals(library_id))],
		)
		.exec()
		.await?;

	log::debug!("Created new series: {:?}", series);

	Ok(series)
}

pub async fn insert_series_many(
	ctx: &Ctx,
	entries: Vec<DirEntry>,
	library_id: String,
) -> Vec<series::Data> {
	let mut inserted_series = vec![];

	for entry in entries {
		match insert_series(&ctx, &entry, library_id.clone()).await {
			Ok(series) => {
				let _ = ctx.emit_client_event(ClientEvent::CreatedSeries(series.clone()));

				inserted_series.push(series);
			},
			Err(e) => {
				log::error!("Failed to insert series: {:?}", e);
			},
		}
	}

	inserted_series
}

pub async fn mark_media_missing(
	ctx: &Ctx,
	paths: Vec<String>,
) -> Result<i64, QueryError> {
	let db = ctx.get_db();

	db._execute_raw(raw!(format!(
		"UPDATE media SET status=\"{}\" WHERE path in ({})",
		"MISSING".to_string(),
		paths
			.into_iter()
			.map(|path| format!("\"{}\"", path))
			.collect::<Vec<_>>()
			.join(",")
	)
	.as_str()))
		.exec()
		.await
}

pub async fn batch_media_operations(
	ctx: &Ctx,
	operations: Vec<BatchScanOperation>,
	library_options: &LibraryOptions,
) -> Result<Vec<media::Data>, ScanError> {
	// Note: this won't work if I add any other operations...
	let (create_operations, mark_missing_operations): (Vec<_>, Vec<_>) =
		operations.into_iter().partition(|operation| {
			matches!(
				operation,
				BatchScanOperation::CreateMedia {
					path: _,
					series_id: __
				}
			)
		});

	let media_creates = create_operations
		.into_iter()
		.map(|operation| {
			match operation {
				BatchScanOperation::CreateMedia { path, series_id } => {
					// let result = insert_media(&ctx, &path, series_id, &library_options).await;
					get_tentative_media(&path, series_id, library_options)
				},
				_ => unreachable!(),
			}
		})
		.filter_map(|res| match res {
			Ok(entry) => Some(entry.into_action(ctx)),
			Err(e) => {
				log::error!("Failed to create media: {:?}", e);

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

	if let Err(err) = mark_media_missing(ctx, missing_paths).await {
		log::error!("Failed to mark media missing: {:?}", err);
	} else {
		log::debug!("Marked media missing");
	}

	Ok(ctx.db._batch(media_creates).await?)
}
