use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};

/// A resize option which will resize the image while maintaining the aspect ratio.
/// The dimension *not* specified will be calculated based on the aspect ratio.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScaledDimensionResize {
	/// A height (in pixels) the resulting image should be scaled to
	Height(u32),
	/// A width (in pixels) the resulting image should be scaled to
	Width(u32),
}

/// A resize option which will resize the image to the given dimensions, without
/// maintaining the aspect ratio.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExactDimensionResize {
	/// The width (in pixels) the resulting image should be resized to
	pub width: u32,
	/// The height (in pixels) the resulting image should be resized to
	pub height: u32,
}

#[derive(Debug, Default, Copy, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScaleEvenlyByFactor {
	/// The factor to scale the image by
	pub factor: f32,
}

impl Eq for ScaleEvenlyByFactor {}

/// The resize options to use when generating an image
#[derive(Debug, Default, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImageResizeMethod {
	Exact(ExactDimensionResize),
	ScaleEvenlyByFactor(ScaleEvenlyByFactor),
	ScaleDimension(ScaledDimensionResize),
	#[default]
	None,
}

// TODO(339): Support JpegXl and Avif

/// Supported image formats for processing images throughout Stump
#[derive(Default, Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SupportedImageFormat {
	Webp,
	#[default]
	Jpeg,
	Png,
}

impl SupportedImageFormat {
	/// Get the file extension for the image format.
	pub fn extension(&self) -> &'static str {
		match self {
			SupportedImageFormat::Webp => "webp",
			SupportedImageFormat::Jpeg => "jpeg",
			SupportedImageFormat::Png => "png",
		}
	}
}

/// Options for processing images throughout Stump.
#[derive(
	Default, Debug, Clone, Serialize, Deserialize, PartialEq, Eq, FromJsonQueryResult,
)]
pub struct ImageProcessorOptions {
	/// The size factor to use when generating an image. See [`ImageResizeOptions`]
	#[serde(default)]
	pub resize_method: ImageResizeMethod,
	/// The format to use when generating an image. See [`SupportedImageFormat`]
	#[serde(default)]
	pub format: SupportedImageFormat,
	/// The quality to use when generating an image. This is a number between 1 and 100,
	/// where 100 is the highest quality. Omitting this value will use the default quality
	/// of 100.
	pub quality: Option<u16>,
	/// The page to use when generating an image. This is not applicable to all media formats.
	pub page: Option<i32>,
}

impl ImageProcessorOptions {
	pub fn with_page(self, page: i32) -> Self {
		Self {
			page: Some(page),
			..self
		}
	}
}
