use std::path::Path;

use prisma_client_rust::chrono::{DateTime, Utc};
use tracing::{debug, error, trace, warn};
use walkdir::DirEntry;

use crate::{
	db::{
		entity::{
			FileStatus, Library, LibraryOptions, Media, MediaBuilder, MediaBuilderOptions,
		},
		MediaDAO, DAO,
	},
	error::{CoreError, CoreResult},
	filesystem::{media::process, scanner::common::BatchScanOperation},
	prisma::{library, media, series, PrismaClient},
	Ctx,
};

// TODO: I hate this here, but I don't know where else to put it.
// Like naming variables, stuff like this is hard lol
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
		let processed_entry = process(path, options.library_options.into())?;
		trace!(?processed_entry, "Processed entry");

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
		let pages = if let Some(metadata) = &processed_entry.metadata {
			metadata.page_count.unwrap_or(processed_entry.pages)
		} else {
			processed_entry.pages
		};

		Ok(Media {
			name,
			size: size.try_into().unwrap_or_else(|e| {
				error!(error = ?e, "Error occurred trying to calculate file size");
				0
			}),
			extension: ext,
			pages,
			hash: processed_entry.hash,
			path: path_str,
			series_id: options.series_id,
			metadata: processed_entry.metadata,
			..Default::default()
		})
	}
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

// TODO: parallelize this
pub async fn batch_media_operations(
	ctx: &Ctx,
	operations: Vec<BatchScanOperation>,
	library_options: &LibraryOptions,
) -> CoreResult<Vec<Media>> {
	let media_dao = MediaDAO::new(ctx.db.clone());

	let (media_to_create, media_to_update, missing_paths) =
		operations
			.into_iter()
			.fold(
				(vec![], vec![], vec![]),
				|mut acc, operation| match operation {
					BatchScanOperation::InsertMedia(generated) => {
						acc.0.push(generated);
						acc
					},
					BatchScanOperation::UpdateMedia(outdated_media) => {
						warn!(
							?outdated_media,
							"Stump currently has minimal support for updating media. This will be improved in the future.",
						);
						let build_result = Media::build_with_options(
							Path::new(&outdated_media.path),
							MediaBuilderOptions {
								series_id: outdated_media.series_id.clone(),
								library_options: library_options.clone(),
							},
						);

						if let Ok(newer_media) = build_result {
							acc.1.push(outdated_media.resolve_changes(&newer_media));
						} else {
							error!(
								?build_result,
								"Error occurred trying to build media entity for update",
							);
						}

						acc
					},
					BatchScanOperation::MarkMediaMissing { path } => {
						acc.2.push(path);
						acc
					},
					_ => unreachable!()
				},
			);

	trace!(
		media_creates_len = media_to_create.len(),
		media_updates_len = media_to_update.len(),
		missing_paths_len = missing_paths.len(),
		"Partitioned batch operations",
	);

	let update_result = media_dao.update_many(media_to_update).await;
	if let Err(err) = update_result {
		error!(query_error = ?err, "Error occurred trying to update media entities");
	} else {
		debug!(
			updated_count = update_result.unwrap().len(),
			"Updated media"
		)
	}

	let marked_missing_result = media_dao.mark_paths_missing(missing_paths).await;
	if let Err(err) = marked_missing_result {
		error!(
			query_error = ?err,
			"Error occurred trying to mark media as missing",
		);
	}

	let created_media = media_dao.create_many(media_to_create).await?;
	debug!(created_media_len = created_media.len(), "Created media");

	// FIXME: make return generic (not literally)
	Ok(created_media)
}

pub async fn mark_library_missing(
	db: &PrismaClient,
	library: &library::Data,
) -> CoreResult<Library> {
	let series_ids = library
		.series()
		.unwrap_or(&vec![])
		.iter()
		.map(|s| s.id.clone())
		.collect();

	let (updated_library, affected_series, affected_media) = db
		._transaction()
		.run(|client| async move {
			let updated_library = client
				.library()
				.update(
					library::id::equals(library.id.clone()),
					vec![library::status::set(FileStatus::Missing.to_string())],
				)
				.exec()
				.await?;

			let affected_series = client
				.series()
				.update_many(
					vec![series::library_id::equals(Some(library.id.clone()))],
					vec![series::status::set(FileStatus::Missing.to_string())],
				)
				.exec()
				.await?;

			client
				.media()
				.update_many(
					vec![media::series_id::in_vec(series_ids)],
					vec![media::status::set(FileStatus::Missing.to_string())],
				)
				.exec()
				.await
				.map(|affected_media| (updated_library, affected_series, affected_media))
		})
		.await?;

	tracing::trace!(
		library_id = library.id.as_str(),
		affected_series = affected_series,
		affected_media = affected_media,
		"Marked library as missing"
	);

	Ok(Library::from(updated_library))
}
