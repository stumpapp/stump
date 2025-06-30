use async_graphql::{Enum, InputObject, OneofObject, SimpleObject, Union};
use sea_orm::{prelude::Decimal, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

// TODO(graphql): Evaluate serde usage and see if still needed

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Enum)]
pub enum Dimension {
	Height,
	Width,
}

/// A resize option which will resize the image while maintaining the aspect ratio.
/// The dimension *not* specified will be calculated based on the aspect ratio.
#[derive(
	Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, SimpleObject, InputObject,
)]
#[serde(rename_all = "camelCase")]
#[graphql(input_name = "ScaledDimensionResizeInput")]
pub struct ScaledDimensionResize {
	/// The dimension to set with the given size, e.g. `Height` or `Width`.
	pub dimension: Dimension,
	/// The size (in pixels) to set the specified dimension to.
	pub size: u32,
}

/// A resize option which will resize the image to the given dimensions, without
/// maintaining the aspect ratio.
#[derive(
	Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, SimpleObject, InputObject,
)]
#[graphql(input_name = "ExactDimensionResizeInput")]
pub struct ExactDimensionResize {
	/// The width (in pixels) the resulting image should be resized to
	pub width: u32,
	/// The height (in pixels) the resulting image should be resized to
	pub height: u32,
}

#[derive(
	Debug,
	Default,
	Copy,
	Clone,
	Serialize,
	Deserialize,
	PartialEq,
	SimpleObject,
	InputObject,
)]
#[graphql(input_name = "ScaleEvenlyByFactorInput")]
pub struct ScaleEvenlyByFactor {
	/// The factor to scale the image by. Note that this was made a [Decimal]
	/// to correct precision issues
	pub factor: Decimal,
}

impl Eq for ScaleEvenlyByFactor {}

/// The resize options to use when generating an image
#[derive(
	Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Union, OneofObject,
)]
#[serde(rename_all = "camelCase")]
#[graphql(input_name = "ImageResizeMethodInput")]
pub enum ImageResizeMethod {
	Exact(ExactDimensionResize),
	ScaleEvenlyByFactor(ScaleEvenlyByFactor),
	ScaleDimension(ScaledDimensionResize),
}

// TODO(339): Support JpegXl and Avif

/// Supported image formats for processing images throughout Stump
#[derive(Default, Copy, Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Enum)]
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
	Default,
	Debug,
	Clone,
	Serialize,
	Deserialize,
	PartialEq,
	Eq,
	FromJsonQueryResult,
	SimpleObject,
	InputObject,
)]
#[serde(rename_all = "camelCase")]
#[graphql(input_name = "ImageProcessorOptionsInput")]
pub struct ImageProcessorOptions {
	/// The size factor to use when generating an image. See [`ImageResizeOptions`]
	#[serde(default)]
	pub resize_method: Option<ImageResizeMethod>,
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

// #[cfg(test)]
// mod tests {
// 	use super::*;

// 	#[test]
// 	fn test_serialize_image_processor_options_exact_dimension() {
// 		let options = ImageProcessorOptions {
// 			resize_method: ImageResizeMethod::Exact(ExactDimensionResize {
// 				width: 800,
// 				height: 600,
// 			}),
// 			format: SupportedImageFormat::Webp,
// 			quality: Some(90),
// 			page: Some(1),
// 		};

// 		let serialized = serde_json::to_string(&options).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"resizeMethod":{"exact":{"width":800,"height":600}},"format":"Webp","quality":90,"page":1}"#
// 		);
// 	}

// 	#[test]
// 	fn test_serialize_image_processor_options_scale_evenly() {
// 		let options = ImageProcessorOptions {
// 			resize_method: ImageResizeMethod::ScaleEvenlyByFactor(ScaleEvenlyByFactor {
// 				factor: 0.65,
// 			}),
// 			format: SupportedImageFormat::Webp,
// 			quality: Some(90),
// 			page: Some(1),
// 		};

// 		let serialized = serde_json::to_string(&options).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"resizeMethod":{"scaleEvenlyByFactor":{"factor":0.65}},"format":"Webp","quality":90,"page":1}"#
// 		);
// 	}

// 	#[test]
// 	fn test_serialize_image_processor_options_scaled_dimension() {
// 		let options = ImageProcessorOptions {
// 			resize_method: ImageResizeMethod::ScaleDimension(
// 				ScaledDimensionResize::Height(600),
// 			),
// 			format: SupportedImageFormat::Webp,
// 			quality: Some(90),
// 			page: Some(1),
// 		};
// 		let serialized = serde_json::to_string(&options).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"resizeMethod":{"scaleDimension":{"height":600}},"format":"Webp","quality":90,"page":1}"#
// 		);

// 		let options = ImageProcessorOptions {
// 			resize_method: ImageResizeMethod::ScaleDimension(
// 				ScaledDimensionResize::Width(800),
// 			),
// 			..options
// 		};
// 		let serialized = serde_json::to_string(&options).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"resizeMethod":{"scaleDimension":{"width":800}},"format":"Webp","quality":90,"page":1}"#
// 		);
// 	}

// 	#[test]
// 	fn test_serialize_image_processor_options_none() {
// 		let options = ImageProcessorOptions {
// 			resize_method: ImageResizeMethod::None,
// 			format: SupportedImageFormat::Webp,
// 			quality: Some(90),
// 			page: Some(1),
// 		};
// 		let serialized = serde_json::to_string(&options).unwrap();
// 		assert_eq!(
// 			serialized,
// 			r#"{"resizeMethod":"none","format":"Webp","quality":90,"page":1}"#
// 		);
// 	}
// }
