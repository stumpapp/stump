use std::fs;

use image::{imageops, DynamicImage, EncodableLayout, GenericImageView};
use models::shared::image_processor_options::{
	Dimension, ImageProcessorOptions, ImageResizeMethod,
};
use webp::Encoder;

use crate::filesystem::{
	error::FileError,
	image::process::resized_dimensions,
	image::{process::ImageProcessor, ProcessorError},
};

use super::{scale_height_dimension, scale_width_dimension, ScaledDimensionResize};

pub struct WebpProcessor;

impl ImageProcessor for WebpProcessor {
	fn generate(
		buffer: &[u8],
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, ProcessorError> {
		// Load the image from memory
		let mut image = image::load_from_memory(buffer)?;

		// Apply resizing if requested
		if let Some(method) = options.resize_method {
			let resized_image = WebpProcessor::resize_image(image, method);
			image = resized_image;
		}

		// Generate WebP with quality setting
		let encoder = Encoder::from_image(&image)
			.map_err(|err| FileError::WebpEncodeError(err.to_string()))?;
		let encoded_webp = encoder.encode(100f32);

		// Convert to Vec<u8> and shrink to fit to free excess capacity
		let mut result = encoded_webp.as_bytes().to_vec();
		result.shrink_to_fit();

		Ok(result)
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
		let image = image::load_from_memory(buf)?;

		let (current_width, current_height) = image.dimensions();

		let (width, height) = match config.dimension {
			Dimension::Width => scale_height_dimension(
				current_width as f32,
				current_height as f32,
				config.size as f32,
			),
			Dimension::Height => scale_width_dimension(
				current_width as f32,
				current_height as f32,
				config.size as f32,
			),
		};

		let resized_image =
			image.resize(width, height, image::imageops::FilterType::Lanczos3);

		let encoder = Encoder::from_image(&resized_image)
			.map_err(|err| FileError::WebpEncodeError(err.to_string()))?;
		let encoded_webp = encoder.encode(100f32);

		Ok(encoded_webp.as_bytes().to_vec())
	}
}

impl WebpProcessor {
	fn resize_image(
		image: DynamicImage,
		resize_method: ImageResizeMethod,
	) -> DynamicImage {
		let (current_width, current_height) = image.dimensions();
		let (height, width) =
			resized_dimensions(current_height, current_width, resize_method);
		DynamicImage::ImageRgba8(imageops::resize(
			&image,
			width,
			height,
			// TODO: determine best filter or allow user to specify
			imageops::FilterType::Triangle,
		))
	}
}

#[cfg(test)]
mod tests {
	use models::shared::image_processor_options::{
		ExactDimensionResize, ScaleEvenlyByFactor, SupportedImageFormat,
	};
	use rust_decimal::Decimal;

	use super::*;
	use crate::filesystem::image::tests::{
		get_test_jpg_path, get_test_png_path, get_test_webp_path,
	};
	use std::fs;

	#[test]
	fn test_generate_webp_from_webp_data() {
		let bytes = get_test_webp_data();
		let options = ImageProcessorOptions {
			resize_method: None,
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let result = WebpProcessor::generate(&bytes, options);
		assert!(result.is_ok());

		let webp_bytes = result.unwrap();
		// should *still* be a valid webp image
		assert!(image::load_from_memory_with_format(
			&webp_bytes,
			image::ImageFormat::WebP
		)
		.is_ok());
	}

	#[test]
	fn test_generate_webp_from_jpg() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			resize_method: None,
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let result = WebpProcessor::generate_from_path(&jpg_path, options);
		assert!(result.is_ok());

		let webp_bytes = result.unwrap();
		// should be a valid webp image
		assert!(image::load_from_memory_with_format(
			&webp_bytes,
			image::ImageFormat::WebP
		)
		.is_ok());
	}

	#[test]
	fn test_generate_webp_from_jpg_with_even_rescale() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::ScaleEvenlyByFactor(
				ScaleEvenlyByFactor {
					factor: Decimal::new(5, 1),
				},
			)),
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let current_dimensions =
			image::image_dimensions(&jpg_path).expect("Failed to get dimensions");

		let buffer = WebpProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, (current_dimensions.0 as f32 * 0.5) as u32);
		assert_eq!(dimensions.1, (current_dimensions.1 as f32 * 0.5) as u32);
	}

	#[test]
	fn test_generate_webp_from_jpg_with_exact_resize() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				width: 100,
				height: 100,
			})),
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let buffer = WebpProcessor::generate_from_path(&jpg_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, 100);
		assert_eq!(dimensions.1, 100);
	}

	#[test]
	fn test_generate_webp_from_png() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			resize_method: None,
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let result = WebpProcessor::generate_from_path(&png_path, options);
		assert!(result.is_ok());

		let webp_bytes = result.unwrap();
		// should be a valid webp image
		assert!(image::load_from_memory_with_format(
			&webp_bytes,
			image::ImageFormat::WebP
		)
		.is_ok());
	}

	#[test]
	fn test_generate_webp_from_png_with_rescale() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::ScaleEvenlyByFactor(
				ScaleEvenlyByFactor {
					factor: Decimal::new(5, 1),
				},
			)),
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let current_dimensions =
			image::image_dimensions(&png_path).expect("Failed to get dimensions");

		let buffer = WebpProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, (current_dimensions.0 as f32 * 0.5) as u32);
		assert_eq!(dimensions.1, (current_dimensions.1 as f32 * 0.5) as u32);
	}

	#[test]
	fn test_generate_webp_from_png_with_resize() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				width: 100,
				height: 100,
			})),
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let buffer = WebpProcessor::generate_from_path(&png_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, 100);
		assert_eq!(dimensions.1, 100);
	}

	#[test]
	fn test_generate_webp_from_webp() {
		let webp_path = get_test_webp_path();
		let options = ImageProcessorOptions {
			resize_method: None,
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		WebpProcessor::generate_from_path(&webp_path, options).unwrap();
	}

	#[test]
	fn test_generate_webp_from_webp_with_rescale() {
		let webp_path = get_test_webp_path();
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::ScaleEvenlyByFactor(
				ScaleEvenlyByFactor {
					factor: Decimal::new(5, 1),
				},
			)),
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let current_dimensions =
			image::image_dimensions(&webp_path).expect("Failed to get dimensions");

		let buffer = WebpProcessor::generate_from_path(&webp_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, (current_dimensions.0 as f32 * 0.5) as u32);
		assert_eq!(dimensions.1, (current_dimensions.1 as f32 * 0.5) as u32);
	}

	#[test]
	fn test_generate_webp_from_webp_with_resize() {
		let webp_path = get_test_webp_path();
		let options = ImageProcessorOptions {
			resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
				width: 100,
				height: 100,
			})),
			format: SupportedImageFormat::Webp,
			quality: None,
			page: None,
		};

		let buffer = WebpProcessor::generate_from_path(&webp_path, options)
			.expect("Failed to generate image buffer");

		let dimensions = image::load_from_memory(&buffer)
			.expect("Failed to load image from buffer")
			.dimensions();

		assert_eq!(dimensions.0, 100);
		assert_eq!(dimensions.1, 100);
	}

	fn get_test_webp_data() -> Vec<u8> {
		let path = get_test_webp_path();
		fs::read(path).expect("Failed to fetch example webp image")
	}
}
