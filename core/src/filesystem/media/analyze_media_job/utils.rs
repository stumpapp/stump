use crate::{
	db::entity::Media,
	filesystem::{analyze_media_job::MediaID, ContentType},
	job::{error::JobError, WorkerCtx},
	prisma::{media, media_metadata},
};

/// A utility function for fetching media by its [MediaID] with metadata (but not page dimensions) loaded.
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
			JobError::TaskFailed(format!("Unable to find media item with id: {}", id))
		})?
		.into();

	Ok(media_item)
}

/// A utility function for fetching media by its [MediaID] with metadata and page dimensions loaded.
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
			JobError::TaskFailed(format!("Unable to find media item with id: {}", id))
		})?
		.into();

	Ok(media_item)
}

/// Convert a ContentType into an [image::ImageFormat], returning an error if the type
/// isn't compatible with the [image] crate.
pub fn into_image_format(
	content_type: ContentType,
) -> Result<image::ImageFormat, JobError> {
	match content_type {
		ContentType::PNG => Ok(image::ImageFormat::Png),
		ContentType::JPEG => Ok(image::ImageFormat::Jpeg),
		ContentType::WEBP => Ok(image::ImageFormat::WebP),
		ContentType::GIF => Ok(image::ImageFormat::Gif),
		_ => Err(JobError::TaskFailed(format!(
			"Unsupported image format: {}",
			content_type
		))),
	}
}
