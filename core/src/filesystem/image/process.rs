use models::shared::image_processor_options::{
	ImageProcessorOptions, ImageResizeMethod, ScaleEvenlyByFactor, ScaledDimensionResize,
};

use super::{scale_height_dimension, scale_width_dimension, ProcessorError};

pub trait ImageProcessorOptionsExt {
	type Error;

	fn validate(&self) -> Result<(), Self::Error>;
}

impl ImageProcessorOptionsExt for ImageProcessorOptions {
	type Error = ProcessorError;

	/// Validate the image processor options to ensure that they are valid.
	fn validate(&self) -> Result<(), ProcessorError> {
		if let Some(quality) = self.quality {
			if !(0..=100).contains(&quality) {
				return Err(ProcessorError::InvalidQuality);
			}
		}

		match self.resize_method {
			ImageResizeMethod::ScaleEvenlyByFactor(scaling) => {
				if !(0.0..=1.0).contains(&scaling.factor) {
					tracing::error!(?scaling, "Invalid scaling factor");
					return Err(ProcessorError::InvalidSizedImage);
				}
			},
			ImageResizeMethod::Exact(dimensions) => {
				let invalid_height = dimensions.height < 1;
				let invalid_width = dimensions.width < 1;

				if invalid_height || invalid_width {
					tracing::error!(?dimensions, "Invalid dimensions");
					return Err(ProcessorError::InvalidSizedImage);
				}
			},
			ImageResizeMethod::ScaleDimension(scaling) => {
				let is_invalid = match scaling {
					ScaledDimensionResize::Height(height) => height < 1,
					ScaledDimensionResize::Width(width) => width < 1,
				};
				if is_invalid {
					tracing::error!(?scaling, "Invalid scaling dimension");
					return Err(ProcessorError::InvalidSizedImage);
				}
			},
			ImageResizeMethod::None => (),
		}

		Ok(())
	}
}

/// Trait defining a standard API for processing images throughout Stump.
pub trait ImageProcessor {
	/// Generate an image from a buffer. If options are provided,
	/// the image will be adjusted accordingly.
	fn generate(
		buffer: &[u8],
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, ProcessorError>;
	/// Generate an image from a given path in the filesystem. If options are provided,
	/// the image will be adjusted accordingly.
	fn generate_from_path(
		path: &str,
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, ProcessorError>;

	// TODO: try and merge options so that this can be part of
	// generate instead of separate

	fn resize_scaled(
		buf: &[u8],
		dimension: ScaledDimensionResize,
	) -> Result<Vec<u8>, ProcessorError>;
}

pub fn resized_dimensions(
	current_height: u32,
	current_width: u32,
	resize_method: ImageResizeMethod,
) -> (u32, u32) {
	match resize_method {
		ImageResizeMethod::Exact(dimensions) => (dimensions.height, dimensions.width),
		ImageResizeMethod::ScaleEvenlyByFactor(ScaleEvenlyByFactor { factor }) => (
			(current_height as f32 * factor) as u32,
			(current_width as f32 * factor) as u32,
		),
		ImageResizeMethod::ScaleDimension(scaling) => match scaling {
			ScaledDimensionResize::Width(width) => {
				let (width, height) = scale_height_dimension(
					current_width as f32,
					current_height as f32,
					width as f32,
				);
				(height, width)
			},
			ScaledDimensionResize::Height(height) => {
				let (width, height) = scale_width_dimension(
					current_width as f32,
					current_height as f32,
					height as f32,
				);
				(height, width)
			},
		},
		ImageResizeMethod::None => (current_height, current_width),
	}
}

// TODO(sea-orm): Fix
// #[cfg(test)]
// mod tests {
// 	use super::*;

// 	#[test]
// 	fn test_image_format_extension() {
// 		assert_eq!(ImageFormat::Webp.extension(), "webp");
// 		// assert_eq!(ImageFormat::Avif.extension(), "avif");
// 		assert_eq!(ImageFormat::Jpeg.extension(), "jpeg");
// 		// assert_eq!(ImageFormat::JpegXl.extension(), "jxl");
// 		assert_eq!(ImageFormat::Png.extension(), "png");
// 	}

// 	#[test]
// 	fn test_image_format_into_image_output_format() {
// 		assert_eq!(
// 			image::ImageFormat::from(ImageFormat::Webp),
// 			image::ImageFormat::WebP
// 		);
// 		assert_eq!(
// 			image::ImageFormat::from(ImageFormat::Jpeg),
// 			image::ImageFormat::Jpeg
// 		);
// 		assert_eq!(
// 			image::ImageFormat::from(ImageFormat::Png),
// 			image::ImageFormat::Png
// 		);
// 	}

// 	#[test]
// 	fn test_resized_dimensions_scaled() {
// 		let (height, width) =
// 			resized_dimensions(100, 100, &ImageResizeOptions::scaled(0.75, 0.5));
// 		assert_eq!(height, 75);
// 		assert_eq!(width, 50);
// 	}

// 	#[test]
// 	fn test_resized_dimensions_sized() {
// 		let (height, width) =
// 			resized_dimensions(100, 100, &ImageResizeOptions::sized(50.0, 50.0));
// 		assert_eq!(height, 50);
// 		assert_eq!(width, 50);
// 	}

// 	#[test]
// 	fn test_validate_quality() {
// 		let options = ImageProcessorOptions {
// 			quality: Some(50.0),
// 			..Default::default()
// 		};

// 		assert!(options.validate().is_ok());

// 		let options = ImageProcessorOptions {
// 			quality: Some(101.0),
// 			..Default::default()
// 		};

// 		assert!(options.validate().is_err());
// 	}

// 	#[test]
// 	fn test_validate_resize() {
// 		let options = ImageProcessorOptions {
// 			resize_options: Some(ImageResizeOptions::sized(100.0, 100.0)),
// 			..Default::default()
// 		};

// 		assert!(options.validate().is_ok());

// 		let options = ImageProcessorOptions {
// 			resize_options: Some(ImageResizeOptions::sized(0.5, 0.5)),
// 			..Default::default()
// 		};

// 		assert!(options.validate().is_err());
// 	}

// 	#[test]
// 	fn test_validate_scaled_resize() {
// 		let options = ImageProcessorOptions {
// 			resize_options: Some(ImageResizeOptions::scaled(0.5, 0.5)),
// 			..Default::default()
// 		};

// 		assert!(options.validate().is_ok());

// 		let options = ImageProcessorOptions {
// 			resize_options: Some(ImageResizeOptions::scaled(1.5, 1.5)),
// 			..Default::default()
// 		};

// 		assert!(options.validate().is_err());
// 	}
// }
