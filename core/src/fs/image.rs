use image::{
	imageops, io::Reader, DynamicImage, EncodableLayout, GenericImageView, ImageFormat,
};
use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use std::{
	fs::File,
	io::{Cursor, Read, Write},
	path::{Path, PathBuf},
};
use tracing::{debug, error, trace};
use webp::{Encoder, WebPMemory};

use crate::{
	config::get_thumbnails_dir, db::models::Media, prelude::errors::ProcessFileError,
};

use super::media_file;

pub fn get_bytes<P: AsRef<Path>>(path: P) -> Result<Vec<u8>, ProcessFileError> {
	let mut file = File::open(path)?;

	let mut buf = Vec::new();
	file.read_to_end(&mut buf)?;

	Ok(buf)
}

pub fn webp_from_path<P: AsRef<Path>>(file_path: P) -> Result<Vec<u8>, ProcessFileError> {
	let image = Reader::open(file_path.as_ref())?
		.with_guessed_format()?
		.decode()?;

	let (width, height) = image.dimensions();

	// TODO: perhaps make size factor configurable?
	let size_factor = 0.5;

	let image = DynamicImage::ImageRgba8(imageops::resize(
		&image,
		(width as f64 * size_factor) as u32,
		(height as f64 * size_factor) as u32,
		// TODO: determine best filter
		imageops::FilterType::Triangle,
	));

	let encoder: Encoder = Encoder::from_image(&image)
		.map_err(|err| ProcessFileError::WebpEncodeError(err.to_string()))?;

	let encoded_webp: WebPMemory = encoder.encode(65f32);

	Ok(encoded_webp.as_bytes().to_vec())
}

pub fn jpeg_from_path<P: AsRef<Path>>(file_path: P) -> Result<Vec<u8>, ProcessFileError> {
	let image = Reader::open(file_path.as_ref())?
		.with_guessed_format()?
		.decode()?;

	let mut buffer = Cursor::new(vec![]);
	image.write_to(&mut buffer, ImageFormat::Jpeg)?;

	Ok(buffer.into_inner())
}

pub fn jpeg_from_bytes(bytes: &[u8]) -> Result<Vec<u8>, ProcessFileError> {
	let image = image::load_from_memory(bytes)?;

	let mut buffer = Cursor::new(vec![]);
	image.write_to(&mut buffer, ImageFormat::Jpeg)?;

	Ok(buffer.into_inner())
}

// TODO: this is **super** slow!!!!
pub fn webp_from_bytes(bytes: &[u8]) -> Result<Vec<u8>, ProcessFileError> {
	let image = image::load_from_memory(bytes)?;

	let (width, height) = image.dimensions();

	// TODO: perhaps make size factor configurable?
	let size_factor = 0.5;

	let image = DynamicImage::ImageRgba8(imageops::resize(
		&image,
		(width as f64 * size_factor) as u32,
		(height as f64 * size_factor) as u32,
		// TODO: determine best filter
		imageops::FilterType::Triangle,
	));

	let encoder: Encoder = Encoder::from_image(&image)
		.map_err(|err| ProcessFileError::WebpEncodeError(err.to_string()))?;

	let encoded_webp: WebPMemory = encoder.encode(5.0);

	Ok(encoded_webp.as_bytes().to_vec())
}

// FIXME: I won't sugar coat it, the output here looks like shit. Fuzzy, blurry, just bad...
pub fn generate_thumbnail(id: &str, path: &str) -> Result<PathBuf, ProcessFileError> {
	let (_, buf) = media_file::get_page(path, 1)?;
	let webp_buf = webp_from_bytes(&buf)?;

	let thumbnail_path = get_thumbnails_dir().join(format!("{}.webp", &id));

	if !thumbnail_path.exists() {
		let mut webp_image = File::create(&thumbnail_path)?;

		webp_image.write_all(&webp_buf)?;
	} else {
		trace!("Thumbnail already exists for {}", &id);
	}

	Ok(thumbnail_path)
}

// TODO: does this need to return a result?
pub fn generate_thumbnails(media: &[Media]) -> Result<Vec<PathBuf>, ProcessFileError> {
	trace!("Enter generate_thumbnails");

	let mut generated_paths = Vec::with_capacity(media.len());

	// Split the array into chunks of 10 images
	for (idx, chunk) in media.chunks(10).enumerate() {
		trace!(chunk = idx, "Processing chunk for thumbnail generation...");
		let results = chunk
			.into_par_iter()
			// .with_max_len(5)
			.map(|m| generate_thumbnail(m.id.as_str(), m.path.as_str()))
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

pub fn remove_thumbnail(id: &str) -> Result<(), ProcessFileError> {
	let thumbnail_path = get_thumbnails_dir().join(format!("{}.webp", id));

	if thumbnail_path.exists() {
		std::fs::remove_file(thumbnail_path)?;
	}

	Ok(())
}

pub fn remove_thumbnails(id_list: &[String]) -> Result<(), ProcessFileError> {
	for id in id_list {
		// TODO: not sure I want the entire process to fail if one thumbnail fails to delete...
		// for now, I will leave it as is. I can't see to many cases where this would happen, but
		// it's obviously possible.
		remove_thumbnail(id)?;
	}

	Ok(())
}
