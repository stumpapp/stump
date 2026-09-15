use std::path::{Path, PathBuf};

use models::shared::image_processor_options::SupportedImageFormat;
use tokio::fs;
use tracing::{error, trace};

use crate::{
	config::StumpConfig, fs_utils::ContentType, image::error::ImageProcessorError,
};

/// Reads an already-saved thumbnail from an arbitrary path (e.g. a custom uploaded thumbnail).
pub async fn get_saved_thumbnail(
	path: &Path,
) -> Result<(ContentType, Vec<u8>), ImageProcessorError> {
	let bytes = tokio::fs::read(path).await?;
	let content_type = ContentType::from_path(path);
	Ok((content_type, bytes))
}

/// Finds an existing generated thumbnail in the thumbnails directory by entity ID.
/// Returns `None` if no thumbnail for that ID is found.
pub async fn get_thumbnail(
	thumbnails_dir: PathBuf,
	id: &str,
	_format: Option<SupportedImageFormat>,
) -> Result<Option<(ContentType, Vec<u8>)>, ImageProcessorError> {
	let mut read_dir = tokio::fs::read_dir(&thumbnails_dir).await?;
	while let Some(entry) = read_dir.next_entry().await? {
		let path = entry.path();
		if path
			.file_name()
			.and_then(|f| f.to_str())
			.is_some_and(|n| n.starts_with(id))
		{
			let bytes = tokio::fs::read(&path).await?;
			let content_type = ContentType::from_path(&path);
			return Ok(Some((content_type, bytes)));
		}
	}
	Ok(None)
}

pub async fn place_thumbnail(
	id: &str,
	ext: &str,
	bytes: &[u8],
	config: &StumpConfig,
) -> Result<PathBuf, ImageProcessorError> {
	let thumbnail_path = config.get_thumbnails_dir().join(format!("{id}.{ext}"));
	fs::write(&thumbnail_path, bytes).await?;
	Ok(thumbnail_path)
}

pub const THUMBNAIL_LOG_FREQUENCY: usize = 500;

/// Deletes thumbnails and returns the number deleted if successful, returns
/// [`ImageProcessorError`] otherwise.
pub async fn remove_thumbnails(
	id_list: &[String],
	thumbnails_dir: &Path,
) -> Result<u64, ImageProcessorError> {
	let mut read_dir = tokio::fs::read_dir(thumbnails_dir).await?;

	// Asynchronously collect thumbnails
	let mut found_thumbnails = Vec::with_capacity(id_list.len());
	while let Some(entry) = read_dir.next_entry().await? {
		let path = entry.path();
		if let Some(filename) = path.file_name().and_then(|f| f.to_str()) {
			if id_list.iter().any(|id| filename.starts_with(id)) {
				found_thumbnails.push(path);
			}
		}
	}

	let found_thumbnails_count = found_thumbnails.len();
	tracing::debug!(found_thumbnails_count, "Found thumbnails to remove");

	let mut deleted_thumbnails_count = 0;

	for (idx, path) in found_thumbnails.iter().enumerate() {
		if idx % THUMBNAIL_LOG_FREQUENCY == 0 {
			trace!("Processed {} thumbnails for removal.", idx + 1);
		}

		match tokio::fs::remove_file(path).await {
			Ok(_) => deleted_thumbnails_count += 1,
			Err(e) => {
				error!(error = ?e, ?path, "Error deleting thumbnail!");
				return Err(e.into());
			},
		};
	}

	Ok(deleted_thumbnails_count)
}

pub fn scale_width_dimension(w: f32, h: f32, target_height: f32) -> (u32, u32) {
	let scale = target_height / h;
	((w * scale).round() as u32, (h * scale).round() as u32)
}

pub fn scale_height_dimension(w: f32, h: f32, target_width: f32) -> (u32, u32) {
	let scale = target_width / w;
	((w * scale).round() as u32, (h * scale).round() as u32)
}
