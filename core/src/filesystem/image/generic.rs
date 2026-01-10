use std::{fs, io::Cursor};

use image::{imageops, GenericImageView, ImageFormat};
use models::shared::image_processor_options::{
	Dimension, ImageProcessorOptions, ScaledDimensionResize, SupportedImageFormat,
};

use crate::filesystem::{image::process::resized_dimensions, FileError};

use super::{
	process::ImageProcessor, scale_height_dimension, scale_width_dimension,
	ProcessorError,
};

/// An image processor that works for the most common image types, primarily
/// JPEG and PNG formats.
pub struct GenericImageProcessor;

impl ImageProcessor for GenericImageProcessor {
	fn generate(
		buffer: &[u8],
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, ProcessorError> {
		let mut image = image::load_from_memory(buffer)?;

		if let Some(method) = options.resize_method {
			let (current_width, current_height) = image.dimensions();
			let (height, width) =
				resized_dimensions(current_height, current_width, method);
			image = image.resize_exact(width, height, imageops::FilterType::Triangle);
		}

		let format = match options.format {
			SupportedImageFormat::Jpeg => {
				if image.color().has_alpha() {
					if image.color().has_color() {
						image = image::DynamicImage::from(image.into_rgb8());
					} else {
						image = image::DynamicImage::from(image.into_luma8());
					}
				}
				Ok(ImageFormat::Jpeg)
			},
			SupportedImageFormat::Png => Ok(ImageFormat::Png),
			_ => Err(FileError::IncorrectProcessorError),
		}?;

		let mut buffer = Cursor::new(vec![]);
		image.write_to(&mut buffer, format)?;

		Ok(buffer.into_inner())
	}

	fn generate_from_path(
		path: &str,
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, ProcessorError> {
		let bytes = fs::read(path)?;
		Self::generate(&bytes, options)
	}

	fn resize_scaled(
		buf: &[u8],
		config: ScaledDimensionResize,
	) -> Result<Vec<u8>, ProcessorError> {
		let mut image = image::load_from_memory(buf)?;

		let read_format = image::guess_format(buf)?;
		let format = match read_format {
			ImageFormat::Jpeg => {
				if image.color().has_alpha() {
					if image.color().has_color() {
						image = image::DynamicImage::from(image.into_rgb8());
					} else {
						image = image::DynamicImage::from(image.into_luma8());
					}
				}
				Ok(ImageFormat::Jpeg)
			},
			ImageFormat::Png => Ok(ImageFormat::Png),
			_ => Err(FileError::IncorrectProcessorError),
		}?;

		let (current_width, current_height) = image.dimensions();

		match config.dimension {
			Dimension::Width => {
				let (width, height) = scale_height_dimension(
					current_width as f32,
					current_height as f32,
					config.size as f32,
				);
				image = image.resize_exact(width, height, imageops::FilterType::Triangle);
			},
			Dimension::Height => {
				let (width, height) = scale_width_dimension(
					current_width as f32,
					current_height as f32,
					config.size as f32,
				);
				image = image.resize_exact(width, height, imageops::FilterType::Triangle);
			},
		}

		let mut buffer = Cursor::new(vec![]);
		image.write_to(&mut buffer, format)?;

		Ok(buffer.into_inner())
	}
}

#[cfg(test)]
mod tests {

	use models::shared::image_processor_options::{
		ExactDimensionResize, ImageResizeMethod, ScaleEvenlyByFactor,
	};
	use rust_decimal::Decimal;

	use super::*;
	use crate::filesystem::image::tests::{get_test_jpg_path, get_test_png_path};

	//JPG -> other Tests
	//JPG -> JPG
	#[test]
	fn test_generate_jpg_to_jpg() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Jpeg,
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");
		assert!(!buffer.is_empty());
		// should *still* be a valid JPEG
		assert!(
			image::load_from_memory_with_format(&buffer, image::ImageFormat::Jpeg)
				.is_ok()
		);
	}

	#[test]
	fn test_generate_jpg_to_jpg_with_rescale() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Jpeg,
			resize_method: Some(ImageResizeMethod::ScaleEvenlyByFactor(
				ScaleEvenlyByFactor {
					factor: Decimal::new(5, 1),
				},
			)),
			..Default::default()
		};

		let current_dimensions =
			image::image_dimensions(&jpg_path).expect("Failed to get dimensions");

		let buffer = GenericImageProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");

		let new_dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(new_dimensions.0, (current_dimensions.0 as f32 * 0.5) as u32);
		assert_eq!(new_dimensions.1, (current_dimensions.1 as f32 * 0.5) as u32);
	}

	#[test]
	fn test_generate_jpg_to_jpg_with_resize() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Jpeg,
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				width: 100,
				height: 100,
			})),
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, 100);
		assert_eq!(dimensions.1, 100);
	}

	//JPG -> PNG
	#[test]
	fn test_generate_jpg_to_png() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Png,
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");
		assert!(!buffer.is_empty());
		// should be a valid PNG
		assert!(
			image::load_from_memory_with_format(&buffer, image::ImageFormat::Png).is_ok()
		);
	}

	#[test]
	fn test_generate_jpg_to_png_with_rescale() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Png,
			resize_method: Some(ImageResizeMethod::ScaleEvenlyByFactor(
				ScaleEvenlyByFactor {
					factor: Decimal::new(5, 1),
				},
			)),
			..Default::default()
		};

		let current_dimensions =
			image::image_dimensions(&jpg_path).expect("Failed to get dimensions");

		let buffer = GenericImageProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");

		let new_dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(new_dimensions.0, (current_dimensions.0 as f32 * 0.5) as u32);
		assert_eq!(new_dimensions.1, (current_dimensions.1 as f32 * 0.5) as u32);
	}

	#[test]
	fn test_generate_jpg_to_png_with_resize() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Png,
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				width: 100,
				height: 100,
			})),
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, 100);
		assert_eq!(dimensions.1, 100);
	}

	//JPG -> webp
	#[test]
	fn test_generate_jpg_to_webp_fail() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Webp,
			..Default::default()
		};

		let result = GenericImageProcessor::generate_from_path(&jpg_path, options);
		assert!(result.is_err());
		assert!(matches!(
			result.unwrap_err(),
			ProcessorError::FileError(FileError::IncorrectProcessorError)
		));
	}

	// PNG -> other
	// PNG -> PNG
	#[test]
	fn test_generate_png_to_png() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Png,
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");
		assert!(!buffer.is_empty());
		// should *still* be a valid PNG
		assert!(
			image::load_from_memory_with_format(&buffer, image::ImageFormat::Png).is_ok()
		);
	}

	#[test]
	fn test_generate_png_to_png_with_rescale() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Png,
			resize_method: Some(ImageResizeMethod::ScaleEvenlyByFactor(
				ScaleEvenlyByFactor {
					factor: Decimal::new(5, 1),
				},
			)),
			..Default::default()
		};

		let current_dimensions =
			image::image_dimensions(&png_path).expect("Failed to get dimensions");

		let buffer = GenericImageProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");

		let new_dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(new_dimensions.0, (current_dimensions.0 as f32 * 0.5) as u32);
		assert_eq!(new_dimensions.1, (current_dimensions.1 as f32 * 0.5) as u32);
	}

	#[test]
	fn test_generate_png_to_png_with_resize() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Png,
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				width: 100,
				height: 100,
			})),
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, 100);
		assert_eq!(dimensions.1, 100);
	}

	//PNG -> JPG
	#[test]
	fn test_generate_png_to_jpg() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Jpeg,
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");
		assert!(!buffer.is_empty());
		// should be a valid JPEG
		assert!(
			image::load_from_memory_with_format(&buffer, image::ImageFormat::Jpeg)
				.is_ok()
		);
	}

	#[test]
	fn test_generate_png_to_jpg_with_rescale() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Jpeg,
			resize_method: Some(ImageResizeMethod::ScaleEvenlyByFactor(
				ScaleEvenlyByFactor {
					factor: Decimal::new(5, 1),
				},
			)),
			..Default::default()
		};

		let current_dimensions =
			image::image_dimensions(&png_path).expect("Failed to get dimensions");

		let buffer = GenericImageProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");

		let new_dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(new_dimensions.0, (current_dimensions.0 as f32 * 0.5) as u32);
		assert_eq!(new_dimensions.1, (current_dimensions.1 as f32 * 0.5) as u32);
	}

	#[test]
	fn test_generate_png_to_jpg_with_resize() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			format: SupportedImageFormat::Jpeg,
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				width: 100,
				height: 100,
			})),
			..Default::default()
		};

		let buffer = GenericImageProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, 100);
		assert_eq!(dimensions.1, 100);
	}
}
