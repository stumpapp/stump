use std::path::{Path, PathBuf};

use tokio::fs;
use tracing::{error, trace};

use crate::{config::StumpConfig, filesystem::FileError};

pub async fn place_thumbnail(
	id: &str,
	ext: &str,
	bytes: &[u8],
	config: &StumpConfig,
) -> Result<PathBuf, FileError> {
	let thumbnail_path = config.get_thumbnails_dir().join(format!("{id}.{ext}"));
	fs::write(&thumbnail_path, bytes).await?;
	Ok(thumbnail_path)
}

pub const THUMBNAIL_LOG_FREQUENCY: usize = 500;

/// Deletes thumbnails and returns the number deleted if successful, returns
/// [`FileError`] otherwise.
pub async fn remove_thumbnails(
	id_list: &[String],
	thumbnails_dir: &Path,
) -> Result<u64, FileError> {
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
			trace!("Processed {idx} thumbnails for removal.");
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
