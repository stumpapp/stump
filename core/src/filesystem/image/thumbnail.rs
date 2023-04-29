use std::{fs::File, io::Write, path::PathBuf};

use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use serde::{Deserialize, Serialize};
use specta::Type;
use tracing::{debug, error, trace};

use crate::{
	config::get_thumbnails_dir,
	db::entity::Media,
	filesystem::{media, FileError},
};

use super::{process::ImageProcessor, webp::WebpProcessor};

/// The size factor to use when generating a thumbnail. This can be a
/// scaled factor, where the height and width are scaled by the same factor, a
/// a custom factor, where the height and width are scaled by different factors,
/// or a specific size, where the height and width are set to the specified size.
///
/// All floats are clamped to the range [0.0, 1.0].
#[derive(Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum ThumbnailSizeFactor {
	Scaled(f32),
	CustomScaled(f32, f32),
	Sized(u32, u32),
}

/// The format to use when generating a thumbnail.
#[derive(Default, Serialize, Deserialize, Type)]
pub enum ThumbnailFormat {
	#[default]
	Webp,
	Jpeg,
	JpegXl,
	Png,
}

pub struct ThumbnailOptions {
	pub size_factor: ThumbnailSizeFactor,
	pub format: ThumbnailFormat,
}

impl Default for ThumbnailOptions {
	fn default() -> Self {
		Self {
			size_factor: ThumbnailSizeFactor::Scaled(0.75),
			format: ThumbnailFormat::Webp,
		}
	}
}

pub fn generate_thumbnail(id: &str, media_path: &str) -> Result<PathBuf, FileError> {
	let (_, buf) = media::get_page(media_path, 1)?;

	let thumbnail_path = get_thumbnails_dir().join(format!("{}.webp", &id));
	if !thumbnail_path.exists() {
		let webp_buf =
			WebpProcessor::generate_thumbnail(&buf, ThumbnailOptions::default())?;
		let mut webp_image = File::create(&thumbnail_path)?;
		webp_image.write_all(&webp_buf)?;
	} else {
		trace!("Thumbnail already exists for {}", &id);
	}

	Ok(thumbnail_path)
}

// TODO: does this need to return a result?
pub fn generate_thumbnails(media: &[Media]) -> Result<Vec<PathBuf>, FileError> {
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
