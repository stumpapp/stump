use std::path::PathBuf;

use crate::{config::StumpConfig, filesystem::FileError};
use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use tokio::fs;
use tracing::{error, trace};

pub async fn place_thumbnail(
	id: &str,
	ext: &str,
	bytes: &[u8],
	config: &StumpConfig,
) -> Result<PathBuf, FileError> {
	let thumbnail_path = config.get_thumbnails_dir().join(format!("{}.{}", id, ext));
	fs::write(&thumbnail_path, bytes).await?;
	Ok(thumbnail_path)
}

pub const THUMBNAIL_CHUNK_SIZE: usize = 500;

// TODO: refactor this
/// Deletes thumbnails and returns the number deleted if successful, returns
/// [FileError] otherwise.
pub fn remove_thumbnails(
	id_list: &[String],
	thumbnails_dir: PathBuf,
) -> Result<u64, FileError> {
	let found_thumbnails = thumbnails_dir
		.read_dir()
		.ok()
		.map(|dir| dir.into_iter())
		.map(|iter| {
			iter.filter_map(|entry| {
				entry.ok().and_then(|entry| {
					let path = entry.path();
					let file_name = path.file_name()?.to_str()?.to_string();

					if id_list.iter().any(|id| file_name.starts_with(id)) {
						Some(path)
					} else {
						None
					}
				})
			})
		})
		.map(|iter| iter.collect::<Vec<PathBuf>>())
		.unwrap_or_default();

	let found_thumbnails_count = found_thumbnails.len();
	tracing::debug!(found_thumbnails_count, "Found thumbnails to remove");

	let mut deleted_thumbnails_count = 0;

	for (idx, chunk) in found_thumbnails.chunks(THUMBNAIL_CHUNK_SIZE).enumerate() {
		trace!(chunk = idx + 1, "Processing chunk for thumbnail removal");
		let results = chunk
			.into_par_iter()
			.map(|path| {
				std::fs::remove_file(path)?;
				Ok(())
			})
			.filter_map(|res: Result<(), FileError>| {
				if res.is_err() {
					error!(error = ?res.err(), "Error deleting thumbnail!");
					None
				} else {
					res.ok()
				}
			})
			.collect::<Vec<()>>();

		trace!(deleted_count = results.len(), "Deleted thumbnail batch");
		deleted_thumbnails_count += results.len() as u64;
	}

	Ok(deleted_thumbnails_count)
}
