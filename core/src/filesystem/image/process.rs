use crate::filesystem::error::FileError;

use super::thumbnail::{ThumbnailOptions, ThumbnailSizeFactor};

/// Trait defining a standard API for processing images throughout Stump.
pub trait ImageProcessor {
	/// Generate an image from a buffer
	fn generate(buffer: &[u8]) -> Result<Vec<u8>, FileError>;
	/// Generate an image from a given path in the filesystem
	fn generate_from_path(path: &str) -> Result<Vec<u8>, FileError>;
	/// Generate an resized image from a buffer.
	fn generate_thumbnail(
		buffer: &[u8],
		options: ThumbnailOptions,
	) -> Result<Vec<u8>, FileError>;
	/// Generate a resized image from a given path in the filesystem.
	fn generate_thumbnail_from_path(
		path: &str,
		options: ThumbnailOptions,
	) -> Result<Vec<u8>, FileError>;
}

pub fn resized_dimensions(
	current_height: u32,
	current_width: u32,
	size_options: ThumbnailSizeFactor,
) -> (u32, u32) {
	match size_options {
		ThumbnailSizeFactor::CustomScaled(height_scale, width_scale) => (
			(current_height as f32 * height_scale) as u32,
			(current_width as f32 * width_scale) as u32,
		),
		ThumbnailSizeFactor::Scaled(scale) => (
			(current_height as f32 * scale) as u32,
			(current_width as f32 * scale) as u32,
		),
		ThumbnailSizeFactor::Sized(height, width) => (height, width),
	}
}
