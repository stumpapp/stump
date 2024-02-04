use std::{fs::File, io::Write, path::PathBuf};

use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use tracing::{debug, error, trace};

use crate::{
	config::StumpConfig,
	db::entity::Media,
	filesystem::{media, FileError},
	prisma::media as prisma_media,
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

// TODO: does this need to return a result?
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

// TODO: on progress callback might not be needed anymore
pub fn generate_thumbnails_for_media(
	media: Vec<prisma_media::Data>,
	options: ImageProcessorOptions,
	config: &StumpConfig,
	mut on_progress: impl FnMut(String) + Send + Sync + 'static,
) -> Result<Vec<PathBuf>, FileError> {
	trace!(media_count = media.len(), "Enter generate_thumbnails");

	let mut generated_paths = Vec::with_capacity(media.len());

	for (idx, chunk) in media.chunks(THUMBNAIL_CHUNK_SIZE).enumerate() {
		trace!(chunk = idx + 1, "Processing chunk for thumbnail generation");
		on_progress(
			format!(
				"Processing group {} of {} for thumbnail generation",
				idx + 1,
				media.len() / THUMBNAIL_CHUNK_SIZE
			)
			.to_string(),
		);
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

// TODO: return deleted count
pub fn remove_thumbnails(
	id_list: &[String],
	thumbnails_dir: PathBuf,
) -> Result<(), FileError> {
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

	for path in found_thumbnails {
		std::fs::remove_file(path)?;
	}

	Ok(())
}

pub fn remove_thumbnails_of_type(
	ids: &[String],
	extension: &str,
	thumbnails_dir: PathBuf,
) -> Result<(), FileError> {
	for (idx, chunk) in ids.chunks(THUMBNAIL_CHUNK_SIZE).enumerate() {
		trace!(chunk = idx + 1, "Processing chunk for thumbnail removal");
		let results = chunk
			.into_par_iter()
			.map(|id| {
				let thumbnail_path = thumbnails_dir.join(format!("{}.{}", id, extension));
				if thumbnail_path.exists() {
					std::fs::remove_file(thumbnail_path)?;
				}
				Ok(())
			})
			.filter_map(|res: Result<(), FileError>| {
				if res.is_err() {
					error!(error = ?res.err(), "Error generating thumbnail!");
					None
				} else {
					res.ok()
				}
			})
			.collect::<Vec<()>>();

		debug!(deleted_count = results.len(), "Deleted thumbnail batch");
	}

	debug!("Finished deleting thumbnails");

	Ok(())
}
