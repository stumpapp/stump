use prisma_client_rust::{raw, PrismaValue};
use walkdir::DirEntry;

use crate::{
	config::context::Context,
	fs::media_file,
	prisma::{library, media, series},
	types::{
		errors::{ApiError, ScanError},
		models::MediaMetadata,
	},
};

/// Will mark all series and media within the library as MISSING. Requires the
/// series and series.media relations to have been loaded to function properly.
pub async fn mark_library_missing(
	library: library::Data,
	ctx: &Context,
) -> Result<(), ApiError> {
	let db = ctx.get_db();

	db._execute_raw(raw!(
		"UPDATE series SET status={} WHERE libraryId={}",
		PrismaValue::String("MISSING".to_owned()),
		PrismaValue::String(library.id.clone())
	))
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

	db._execute_raw(raw!(&media_query)).await?;

	Ok(())
}

pub async fn insert_media(
	ctx: &Context,
	entry: &DirEntry,
	series_id: String,
) -> Result<media::Data, ScanError> {
	let processed_entry = media_file::process_entry(entry)?;

	let path = entry.path();

	let metadata = match entry.metadata() {
		Ok(metadata) => Some(metadata),
		_ => None,
	};

	let path_str = path.to_str().unwrap().to_string();
	let mut name = entry.file_name().to_str().unwrap().to_string();
	let ext = path.extension().unwrap().to_str().unwrap().to_string();

	// remove extension from name, not sure why file_name() includes it smh
	if name.ends_with(format!(".{}", ext).as_str()) {
		name.truncate(name.len() - (ext.len() + 1));
	}

	let comic_info = match processed_entry.metadata {
		Some(info) => info,
		None => MediaMetadata::default(),
	};

	let mut size: u64 = 0;
	// let mut modified: DateTime<FixedOffset> = chrono::Utc::now().into();

	if let Some(metadata) = metadata {
		size = metadata.len();

		// if let Ok(st) = metadata.modified() {
		// 	let utc: DateTime<Utc> = st.into();
		// 	modified = utc.into();
		// }
	}

	let media = ctx
		.db
		.media()
		.create(
			media::name::set(name),
			media::size::set(size.try_into().unwrap()),
			media::extension::set(ext),
			media::pages::set(match comic_info.page_count {
				Some(count) => count as i32,
				None => processed_entry.pages,
			}),
			media::path::set(path_str),
			vec![
				media::checksum::set(processed_entry.checksum),
				media::description::set(comic_info.summary),
				media::series::link(series::id::equals(series_id)),
				// media::updated_at::set(modified),
			],
		)
		.exec()
		.await?;

	log::info!("Created new media: {:?}", media);

	// self.on_progress(ClientEvent::CreatedMedia(media.clone()));

	Ok(media)
}

pub async fn insert_series(
	ctx: &Context,
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
			_ => return Err(ScanError::Unknown("Failed to get name".to_string())),
		},
		_ => return Err(ScanError::Unknown("Failed to get name".to_string())),
	};

	let series = ctx
		.db
		.series()
		.create(
			series::name::set(name),
			series::path::set(path.to_str().unwrap().to_string()),
			vec![series::library::link(library::id::equals(library_id))],
		)
		.exec()
		.await?;

	// self.on_progress(ClientEvent::CreatedSeries(series.clone()));

	Ok(series)
}
