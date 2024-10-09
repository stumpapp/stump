use crate::{
	db::entity::Media,
	filesystem::analyze_media_job::MediaID,
	job::{error::JobError, WorkerCtx},
	prisma::{media, media_metadata},
};

/// A utility function for fetching media by its [`MediaID`] with metadata (but not page dimensions) loaded.
pub async fn fetch_media_with_metadata(
	id: &MediaID,
	ctx: &WorkerCtx,
) -> Result<Media, JobError> {
	let media_item: Media = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::metadata::fetch())
		.exec()
		.await
		.map_err(|e: prisma_client_rust::QueryError| JobError::TaskFailed(e.to_string()))?
		.ok_or_else(|| {
			JobError::TaskFailed(format!("Unable to find media item with id: {id}"))
		})?
		.into();

	Ok(media_item)
}

/// A utility function for fetching media by its [`MediaID`] with metadata and page dimensions loaded.
pub async fn fetch_media_with_dimensions(
	id: &MediaID,
	ctx: &WorkerCtx,
) -> Result<Media, JobError> {
	let media_item: Media = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::metadata::fetch().with(media_metadata::page_dimensions::fetch()))
		.exec()
		.await
		.map_err(|e: prisma_client_rust::QueryError| JobError::TaskFailed(e.to_string()))?
		.ok_or_else(|| {
			JobError::TaskFailed(format!("Unable to find media item with id: {id}"))
		})?
		.into();

	Ok(media_item)
}
