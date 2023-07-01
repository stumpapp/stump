use std::{fs::File, io::Write, path::PathBuf};

use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use tracing::{debug, error, trace};

use crate::{
	config::get_thumbnails_dir,
	db::entity::Media,
	filesystem::{media, FileError},
	prisma::media as prisma_media,
};

use super::{
	process::ImageProcessor, webp::WebpProcessor, GenericImageProcessor, ImageFormat,
	ImageProcessorOptions,
};

pub fn generate_thumbnail(
	id: &str,
	media_path: &str,
	options: ImageProcessorOptions,
) -> Result<PathBuf, FileError> {
	let (_, buf) = media::get_page(media_path, 1)?;
	let ext = options.format.extension();

	let thumbnail_path = get_thumbnails_dir().join(format!("{}.{}", &id, ext));
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
) -> Result<Vec<PathBuf>, FileError> {
	trace!("Enter generate_thumbnails");

	let mut generated_paths = Vec::with_capacity(media.len());

	// TODO: configurable chunk size?
	// Split the array into chunks of 5 images
	for (idx, chunk) in media.chunks(5).enumerate() {
		trace!(chunk = idx + 1, "Processing chunk for thumbnail generation");
		let results = chunk
			.into_par_iter()
			.map(|m| generate_thumbnail(m.id.as_str(), m.path.as_str(), options.clone()))
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

pub fn generate_thumbnails_for_media(
	media: Vec<prisma_media::Data>,
	options: ImageProcessorOptions,
) -> Result<Vec<PathBuf>, FileError> {
	trace!("Enter generate_thumbnails");

	let mut generated_paths = Vec::with_capacity(media.len());

	// TODO: configurable chunk size?
	// Split the array into chunks of 5 images
	for (idx, chunk) in media.chunks(5).enumerate() {
		trace!(chunk = idx + 1, "Processing chunk for thumbnail generation");
		let results = chunk
			.into_par_iter()
			.map(|m| generate_thumbnail(m.id.as_str(), m.path.as_str(), options.clone()))
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

pub fn get_thumbnail_path(id: &str) -> Option<PathBuf> {
	let thumbnail_path = get_thumbnails_dir().join(format!("{}.webp", id));

	if thumbnail_path.exists() {
		Some(thumbnail_path)
	} else {
		None
	}
}

pub fn remove_thumbnail(id: &str) -> Result<(), FileError> {
	let thumbnail_path = get_thumbnails_dir().join(format!("{}.webp", id));

	if thumbnail_path.exists() {
		std::fs::remove_file(thumbnail_path)?;
	}

	Ok(())
}

pub fn remove_thumbnails(id_list: &[String]) -> Result<(), FileError> {
	for id in id_list {
		// TODO: not sure I want the entire process to fail if one thumbnail fails to delete...
		// for now, I will leave it as is. I can't see to many cases where this would happen, but
		// it's obviously possible.
		remove_thumbnail(id)?;
	}

	Ok(())
}
