use serde::{Deserialize, Serialize};
use specta::Type;

use crate::filesystem::error::FileError;

/// The size factor to use when generating a thumbnail. This can be a
/// scaled factor, where the height and width are scaled by the same factor, a
/// a custom factor, where the height and width are scaled by different factors,
/// or a specific size, where the height and width are set to the specified size.
///
/// All floats are clamped to the range [0.0, 1.0].
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum ImageSizeFactor {
	Scaled(f32),
	CustomScaled(f32, f32),
	Sized(u32, u32),
}

/// Supported image formats for processing images throughout Stump.
#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, PartialEq, Eq)]
pub enum ImageFormat {
	#[default]
	Webp,
	Jpeg,
	JpegXl,
	Png,
}

impl ImageFormat {
	/// Get the file extension for the image format.
	pub fn extension(&self) -> &'static str {
		match self {
			ImageFormat::Webp => "webp",
			ImageFormat::Jpeg => "jpeg",
			ImageFormat::JpegXl => "jxl",
			ImageFormat::Png => "png",
		}
	}
}

/// Options for processing images throughout Stump.
#[derive(Default, Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImageProcessorOptions {
	/// The size factor to use when generating an image. See [`ImageSizeFactor`]
	pub size_factor: Option<ImageSizeFactor>,
	/// The format to use when generating an image. See [`ImageFormat`]
	pub format: ImageFormat,
	/// The quality to use when generating an image. This is a number between 0.0 and 100.0,
	/// where 100.0 is the highest quality. Omitting this value will use the default quality
	/// of 100.0.
	pub quality: Option<f32>,
}

impl ImageProcessorOptions {
	/// Create a new set of image processor for a simple jpeg conversion. No
	/// resizing or quality adjustments will be made.
	pub fn jpeg() -> Self {
		Self {
			format: ImageFormat::Jpeg,
			..Default::default()
		}
	}
}

impl TryFrom<Vec<u8>> for ImageProcessorOptions {
	// TODO: not a file error really...
	type Error = FileError;

	fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
		serde_json::from_slice(&value)
			.map_err(|err| FileError::UnknownError(err.to_string()))
	}
}

/// Trait defining a standard API for processing images throughout Stump.
pub trait ImageProcessor {
	/// Generate an image from a buffer. If options are provided,
	/// the image will be adjusted accordingly.
	fn generate(
		buffer: &[u8],
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, FileError>;
	/// Generate an image from a given path in the filesystem. If options are provided,
	/// the image will be adjusted accordingly.
	fn generate_from_path(
		path: &str,
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, FileError>;
}

pub fn resized_dimensions(
	current_height: u32,
	current_width: u32,
	size_options: ImageSizeFactor,
) -> (u32, u32) {
	match size_options {
		ImageSizeFactor::CustomScaled(height_scale, width_scale) => (
			(current_height as f32 * height_scale) as u32,
			(current_width as f32 * width_scale) as u32,
		),
		ImageSizeFactor::Scaled(scale) => (
			(current_height as f32 * scale) as u32,
			(current_width as f32 * scale) as u32,
		),
		ImageSizeFactor::Sized(height, width) => (height, width),
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_resized_dimensions() {
		let (height, width) = resized_dimensions(100, 100, ImageSizeFactor::Scaled(0.5));
		assert_eq!(height, 50);
		assert_eq!(width, 50);

		let (height, width) =
			resized_dimensions(100, 100, ImageSizeFactor::CustomScaled(0.5, 0.5));
		assert_eq!(height, 50);
		assert_eq!(width, 50);

		let (height, width) =
			resized_dimensions(100, 100, ImageSizeFactor::Sized(50, 50));
		assert_eq!(height, 50);
		assert_eq!(width, 50);
	}
}
