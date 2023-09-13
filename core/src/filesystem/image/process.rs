use serde::{Deserialize, Serialize};
use specta::Type;

use crate::filesystem::error::FileError;

/// The resize mode to use when generating a thumbnail.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum ImageResizeMode {
	Scaled,
	Sized,
}

/// The resize options to use when generating a thumbnail.
/// When using `Scaled`, the height and width will be scaled by the given factor.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImageResizeOptions {
	pub mode: ImageResizeMode,
	pub height: f32,
	pub width: f32,
}

impl ImageResizeOptions {
	pub fn scaled(height_factor: f32, width_factor: f32) -> Self {
		Self {
			mode: ImageResizeMode::Scaled,
			height: height_factor,
			width: width_factor,
		}
	}

	pub fn sized(height: f32, width: f32) -> Self {
		Self {
			mode: ImageResizeMode::Sized,
			height,
			width,
		}
	}
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

impl From<ImageFormat> for image::ImageOutputFormat {
	fn from(val: ImageFormat) -> Self {
		match val {
			ImageFormat::Webp => {
				image::ImageOutputFormat::Unsupported(String::from("webp"))
			},
			ImageFormat::Jpeg => image::ImageOutputFormat::Jpeg(100),
			ImageFormat::JpegXl => {
				image::ImageOutputFormat::Unsupported(String::from("jxl"))
			},
			ImageFormat::Png => image::ImageOutputFormat::Png,
		}
	}
}

/// Options for processing images throughout Stump.
#[derive(Default, Debug, Clone, Serialize, Deserialize, Type)]
pub struct ImageProcessorOptions {
	/// The size factor to use when generating an image. See [`ImageResizeOptions`]
	pub resize_options: Option<ImageResizeOptions>,
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
	size_options: ImageResizeOptions,
) -> (u32, u32) {
	match size_options.mode {
		ImageResizeMode::Scaled => (
			(current_height as f32 * size_options.height) as u32,
			(current_width as f32 * size_options.width) as u32,
		),
		ImageResizeMode::Sized => (size_options.height as u32, size_options.width as u32),
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_resized_dimensions() {
		let (height, width) =
			resized_dimensions(100, 100, ImageResizeOptions::scaled(0.75, 0.5));
		assert_eq!(height, 75);
		assert_eq!(width, 50);

		let (height, width) =
			resized_dimensions(100, 100, ImageResizeOptions::sized(50.0, 50.0));
		assert_eq!(height, 50);
		assert_eq!(width, 50);
	}
}
