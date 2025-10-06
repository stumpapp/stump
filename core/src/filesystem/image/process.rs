use models::shared::image_processor_options::{
	Dimension, ImageProcessorOptions, ImageResizeMethod, ScaledDimensionResize,
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
			None => (),
			Some(ImageResizeMethod::ScaleEvenlyByFactor(scaling)) => {
				let factor: f32 = scaling.factor.try_into().map_err(|error| {
					tracing::error!(?scaling, ?error, "Invalid scaling factor");
					ProcessorError::InvalidConfiguration(
						"Scaling factor must be a valid float".to_string(),
					)
				})?;
				if !(0.0..=1.0).contains(&factor) {
					tracing::error!(?scaling, "Invalid scaling factor");
					return Err(ProcessorError::InvalidSizedImage);
				}
			},
			Some(ImageResizeMethod::Exact(dimensions)) => {
				let invalid_height = dimensions.height < 1;
				let invalid_width = dimensions.width < 1;

				if invalid_height || invalid_width {
					tracing::error!(?dimensions, "Invalid dimensions");
					return Err(ProcessorError::InvalidSizedImage);
				}
			},
			Some(ImageResizeMethod::ScaleDimension(scaling)) => {
				if scaling.size < 1 {
					tracing::error!(?scaling, "Invalid scaling dimension");
					return Err(ProcessorError::InvalidSizedImage);
				}
			},
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
		ImageResizeMethod::ScaleEvenlyByFactor(scaling) => {
			let factor: f32 = scaling.factor.try_into().unwrap_or_else(|error| {
				tracing::warn!(
					?scaling,
					?error,
					"Invalid scaling factor. Falling back to 1.0"
				);
				1.0
			});
			(
				(current_height as f32 * factor) as u32,
				(current_width as f32 * factor) as u32,
			)
		},
		ImageResizeMethod::ScaleDimension(config) => match config.dimension {
			Dimension::Width => {
				let (width, height) = scale_height_dimension(
					current_width as f32,
					current_height as f32,
					config.size as f32,
				);
				(height, width)
			},
			Dimension::Height => {
				let (width, height) = scale_width_dimension(
					current_width as f32,
					current_height as f32,
					config.size as f32,
				);
				(height, width)
			},
		},
	}
}

#[cfg(test)]
mod tests {
	use models::shared::image_processor_options::{
		ExactDimensionResize, ScaleEvenlyByFactor,
	};
	use rust_decimal::Decimal;

	use super::*;

	#[test]
	fn test_resized_dimensions_scale_evenly() {
		let (height, width) = resized_dimensions(
			100,
			100,
			ImageResizeMethod::ScaleEvenlyByFactor(ScaleEvenlyByFactor {
				factor: Decimal::new(75, 2),
			}),
		);
		assert_eq!(height, 75);
		assert_eq!(width, 75);
	}

	#[test]
	fn test_resized_dimensions_exact() {
		let (height, width) = resized_dimensions(
			100,
			100,
			ImageResizeMethod::Exact(ExactDimensionResize {
				height: 50,
				width: 50,
			}),
		);
		assert_eq!(height, 50);
		assert_eq!(width, 50);
	}

	#[test]
	fn test_validate_quality() {
		let options = ImageProcessorOptions {
			quality: Some(50),
			..Default::default()
		};

		assert!(options.validate().is_ok());

		let options = ImageProcessorOptions {
			quality: Some(101),
			..Default::default()
		};

		assert!(options.validate().is_err());
	}

	#[test]
	fn test_validate_resize() {
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				height: 100,
				width: 100,
			})),
			..Default::default()
		};

		assert!(options.validate().is_ok());

		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				height: 0,
				width: 100,
			})),
			..Default::default()
		};

		assert!(options.validate().is_err());
	}

	#[test]
	fn test_validate_scaled_resize() {
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::ScaleDimension(
				ScaledDimensionResize {
					dimension: Dimension::Width,
					size: 100,
				},
			)),
			..Default::default()
		};

		assert!(options.validate().is_ok());

		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::ScaleDimension(
				ScaledDimensionResize {
					dimension: Dimension::Height,
					size: 0,
				},
			)),
			..Default::default()
		};

		assert!(options.validate().is_err());
	}
}
