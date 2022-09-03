use std::path::Path;

use prisma_client_rust::{raw, PrismaValue};
use walkdir::DirEntry;

use crate::{
	config::context::Ctx,
	event::ClientEvent,
	fs::media_file,
	prisma::{library, media, series},
	types::{
		errors::{ApiError, ScanError},
		models::{library::LibraryOptions, media::MediaMetadata},
	},
};

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

pub async fn insert_media(
	ctx: &Ctx,
	path: &Path,
	series_id: String,
	library_options: &LibraryOptions,
) -> Result<media::Data, ScanError> {
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

	let media = ctx
		.db
		.media()
		.create(
			name,
			size.try_into().unwrap_or_else(|e| {
				log::error!("Failed to calculate file size: {:?}", e);

				0
			}),
			ext,
			match comic_info.page_count {
				Some(count) => count as i32,
				None => processed_entry.pages,
			},
			path_str,
			vec![
				media::checksum::set(processed_entry.checksum),
				media::description::set(comic_info.summary),
				media::series::connect(series::id::equals(series_id)),
			],
		)
		.exec()
		.await?;

	log::debug!("Created new media: {:?}", media);

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

// Note: This faced a similar issue as `scan_concurrent` did. So, commenting out for now..
// pub async fn insert_series_many_concurrent(
// 	ctx: &Context,
// 	entries: Vec<DirEntry>,
// 	library_id: String,
// ) -> Vec<series::Data> {
// 	let tasks = entries
// 		.iter()
// 		.cloned()
// 		.map(|entry| {
// 			let ctx_cpy = ctx.get_ctx();
// 			let library_id = library_id.clone();
// 			tokio::spawn(async move {
// 				super::utils::insert_series(&ctx_cpy, &entry, library_id)
// 					.await
// 					.unwrap()
// 			})
// 		})
// 		.collect::<Vec<JoinHandle<series::Data>>>();

// 	futures::future::join_all(tasks)
// 		.await
// 		.into_iter()
// 		.filter_map(|res| res.ok())
// 		.collect()
// }
