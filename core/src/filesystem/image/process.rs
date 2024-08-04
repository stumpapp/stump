use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::filesystem::error::FileError;

use super::ProcessorError;

/// The resize mode to use when generating a thumbnail.
#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub enum ImageResizeMode {
	Scaled,
	Sized,
}

// TODO: Refactor with a more robust enum:
// enum ImageResizeOptions_ {
// 	Sized {
// 		height: u32,
// 		width: u32,
// 		maintain_aspect_ratio: bool,
// 	},
// 	ScaledExact(f32, f32),
// 	ScaledByFactor(f32),
// }
/// The resize options to use when generating a thumbnail.
/// When using `Scaled`, the height and width will be scaled by the given factor.
#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
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
	Webp,
	#[default]
	Jpeg,
	// JpegXl,
	Png,
}

impl ImageFormat {
	/// Get the file extension for the image format.
	pub fn extension(&self) -> &'static str {
		match self {
			ImageFormat::Webp => "webp",
			ImageFormat::Jpeg => "jpeg",
			// TODO(339): Support JpegXl and Avif
			// ImageFormat::JpegXl => "jxl",
			// ImageFormat::Avif => "avif",
			ImageFormat::Png => "png",
		}
	}
}

impl From<ImageFormat> for image::ImageFormat {
	fn from(val: ImageFormat) -> Self {
		match val {
			ImageFormat::Webp => image::ImageFormat::WebP,
			ImageFormat::Jpeg => image::ImageFormat::Jpeg,
			// See https://github.com/image-rs/image/issues/1765. Image removed the
			// unsupported enum variant, which makes this awkward to support...
			// See also https://github.com/image-rs/image/blob/main/CHANGES.md#version-0250
			// ImageFormat::JpegXl => {
			// 	unreachable!("JpegXl is not supported by the image crate")
			// },
			ImageFormat::Png => image::ImageFormat::Png,
		}
	}
}

/// Options for processing images throughout Stump.
#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct ImageProcessorOptions {
	/// The size factor to use when generating an image. See [`ImageResizeOptions`]
	pub resize_options: Option<ImageResizeOptions>,
	/// The format to use when generating an image. See [`ImageFormat`]
	pub format: ImageFormat,
	/// The quality to use when generating an image. This is a number between 0.0 and 100.0,
	/// where 100.0 is the highest quality. Omitting this value will use the default quality
	/// of 100.0.
	pub quality: Option<f32>,
	// TODO: this implementation is not overly ideal, and is really only here for one-off generation.
	// I would like to iterate after the initial release to make this more robust so that these choices
	// are stored in the database
	/// The page to use when generating an image. This is not applicable to all media formats.
	#[specta(optional)]
	pub page: Option<i32>,
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

	pub fn with_page(self, page: i32) -> Self {
		Self {
			page: Some(page),
			..self
		}
	}

	pub fn validate(&self) -> Result<(), ProcessorError> {
		if let Some(quality) = self.quality {
			if !(0.0..=100.0).contains(&quality) {
				return Err(ProcessorError::InvalidQuality);
			}
		}

		if let Some(resize_options) = &self.resize_options {
			match resize_options.mode {
				ImageResizeMode::Scaled => {
					let invalid_height = !(0.0..=1.0).contains(&resize_options.height);
					let invalid_width = !(0.0..=1.0).contains(&resize_options.width);

					if invalid_height || invalid_width {
						return Err(ProcessorError::InvalidSizedImage);
					}
				},
				ImageResizeMode::Sized => {
					let invalid_height = resize_options.height < 1.0
						|| resize_options.height.fract() != 0.0;
					let invalid_width =
						resize_options.width < 1.0 || resize_options.width.fract() != 0.0;

					if invalid_height || invalid_width {
						return Err(ProcessorError::InvalidSizedImage);
					}
				},
			}
		}

		Ok(())
	}
}

impl TryFrom<Vec<u8>> for ImageProcessorOptions {
	type Error = ProcessorError;

	fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
		serde_json::from_slice(&value)
			.map_err(|err| ProcessorError::InvalidConfiguration(err.to_string()))
	}
}

// TODO: replace error with ProcessorError
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
	fn test_image_format_extension() {
		assert_eq!(ImageFormat::Webp.extension(), "webp");
		assert_eq!(ImageFormat::Jpeg.extension(), "jpeg");
		// assert_eq!(ImageFormat::JpegXl.extension(), "jxl");
		assert_eq!(ImageFormat::Png.extension(), "png");
	}

	#[test]
	fn test_image_format_into_image_output_format() {
		assert_eq!(
			image::ImageFormat::from(ImageFormat::Webp),
			image::ImageFormat::WebP
		);
		assert_eq!(
			image::ImageFormat::from(ImageFormat::Jpeg),
			image::ImageFormat::Jpeg
		);
		assert_eq!(
			image::ImageFormat::from(ImageFormat::Png),
			image::ImageFormat::Png
		);
	}

	#[test]
	fn test_resized_dimensions_scaled() {
		let (height, width) =
			resized_dimensions(100, 100, ImageResizeOptions::scaled(0.75, 0.5));
		assert_eq!(height, 75);
		assert_eq!(width, 50);
	}

	#[test]
	fn test_resized_dimensions_sized() {
		let (height, width) =
			resized_dimensions(100, 100, ImageResizeOptions::sized(50.0, 50.0));
		assert_eq!(height, 50);
		assert_eq!(width, 50);
	}

	#[test]
	fn test_validate_quality() {
		let options = ImageProcessorOptions {
			quality: Some(50.0),
			..Default::default()
		};

		assert!(options.validate().is_ok());

		let options = ImageProcessorOptions {
			quality: Some(101.0),
			..Default::default()
		};

		assert!(options.validate().is_err());
	}

	#[test]
	fn test_validate_resize() {
		let options = ImageProcessorOptions {
			resize_options: Some(ImageResizeOptions::sized(100.0, 100.0)),
			..Default::default()
		};

		assert!(options.validate().is_ok());

		let options = ImageProcessorOptions {
			resize_options: Some(ImageResizeOptions::sized(0.5, 0.5)),
			..Default::default()
		};

		assert!(options.validate().is_err());
	}

	#[test]
	fn test_validate_good_scaled_resize() {
		let options = ImageProcessorOptions {
			resize_options: Some(ImageResizeOptions::scaled(0.5, 0.5)),
			..Default::default()
		};

		assert!(options.validate().is_ok());
	}

	#[test]
	fn test_validate_bad_scaled_resize() {
		let options = ImageProcessorOptions {
			resize_options: Some(ImageResizeOptions::scaled(1.5, 1.5)),
			..Default::default()
		};

		assert!(options.validate().is_err());
	}
}
