use std::{fs::File, io::Write, path::PathBuf};

use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use tracing::{debug, error, trace};

// TODO(perf): This is too slow. A couple of notes:
// - We need to spawn blocking threads for the image processing, currently using rayon which is ideal for CPU-bound tasks
// - Stop chunking. Let the OS thread scheduler handle things for us
// - I think we need to break from this struct and go back to functional, the lifetime constraints dealing with self are a pain when exploring
//   threading options
// See https://ryhl.io/blog/async-what-is-blocking/ -> Summary for good table

mod generation_job;
mod manager;

pub use generation_job::{
	ThumbnailGenerationJob, ThumbnailGenerationJobParams, ThumbnailGenerationJobVariant,
	ThumbnailGenerationOutput,
};
pub use manager::ThumbnailManager;

use crate::{
	config::StumpConfig,
	db::entity::Media,
	filesystem::{media, FileError},
};

use super::{
	process::ImageProcessor, webp::WebpProcessor, GenericImageProcessor, ImageFormat,
	ImageProcessorOptions,
};

pub fn place_thumbnail(
	id: &str,
	ext: &str,
	bytes: &[u8],
	config: &StumpConfig,
) -> Result<PathBuf, FileError> {
	let thumbnail_path = config.get_thumbnails_dir().join(format!("{}.{}", id, ext));

	let mut image_file = File::create(&thumbnail_path)?;
	image_file.write_all(bytes)?;

	Ok(thumbnail_path)
}

pub fn generate_thumbnail(
	id: &str,
	media_path: &str,
	options: ImageProcessorOptions,
	config: &StumpConfig,
) -> Result<PathBuf, FileError> {
	let (_, buf) = media::get_page(media_path, options.page.unwrap_or(1), config)?;
	let ext = options.format.extension();

	let thumbnail_path = config.get_thumbnails_dir().join(format!("{}.{}", &id, ext));
	if !thumbnail_path.exists() {
		// TODO: this will be more complicated once more specialized processors are added...
		let image_buffer = if options.format == ImageFormat::Webp {
			WebpProcessor::generate(&buf, options)?
		} else {
			GenericImageProcessor::generate(&buf, options)?
		};

		let mut image_file = File::create(&thumbnail_path)?;
		image_file.write_all(&image_buffer)?;
	} else {
		trace!(?thumbnail_path, id, "Thumbnail already exists for media");
	}

	Ok(thumbnail_path)
}

pub fn generate_thumbnails(
	media: &[Media],
	options: ImageProcessorOptions,
	config: &StumpConfig,
) -> Result<Vec<PathBuf>, FileError> {
	trace!("Enter generate_thumbnails");

	let mut generated_paths = Vec::with_capacity(media.len());

	// TODO: configurable chunk size?
	// Split the array into chunks of 5 images
	for (idx, chunk) in media.chunks(5).enumerate() {
		trace!(chunk = idx + 1, "Processing chunk for thumbnail generation");
		let results = chunk
			.into_par_iter()
			.map(|m| {
				generate_thumbnail(
					m.id.as_str(),
					m.path.as_str(),
					options.clone(),
					config,
				)
			})
			.filter_map(|res| {
				if res.is_err() {
					error!(error = ?res.err(), "Error generating thumbnail!");
					None
				} else {
					res.ok()
				}
			})
			.collect::<Vec<PathBuf>>();

		debug!(num_generated = results.len(), "Generated thumbnail batch");

		generated_paths.extend(results);
	}

	Ok(generated_paths)
}

pub const THUMBNAIL_CHUNK_SIZE: usize = 5;

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
