use std::{fs, io::Cursor};

use image::{imageops, GenericImageView, ImageFormat};

use crate::filesystem::{image::process::resized_dimensions, FileError};

use super::process::{self, ImageProcessor, ImageProcessorOptions};

/// An image processor that works for the most common image types, primarily
/// JPEG and PNG formats.
pub struct GenericImageProcessor;

impl ImageProcessor for GenericImageProcessor {
	fn generate(
		buffer: &[u8],
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, FileError> {
		let mut image = image::load_from_memory(buffer)?;

		if let Some(resize_options) = options.resize_options {
			let (current_width, current_height) = image.dimensions();
			let (height, width) =
				resized_dimensions(current_height, current_width, &resize_options);
			image = image.resize_exact(width, height, imageops::FilterType::Triangle);
		}

		let format = match options.format {
			process::ImageFormat::Jpeg => {
				if image.color().has_alpha() {
					if image.color().has_color() {
						image = image::DynamicImage::from(image.into_rgb8());
					} else {
						image = image::DynamicImage::from(image.into_luma8());
					}
				}
				Ok(ImageFormat::Jpeg)
			},
			process::ImageFormat::Png => Ok(ImageFormat::Png),
			// TODO: change error kind
			_ => Err(FileError::UnknownError(String::from(
				"Incorrect image processor for requested format.",
			))),
		}?;

		let mut buffer = Cursor::new(vec![]);
		image.write_to(&mut buffer, format)?;

		Ok(buffer.into_inner())
	}

	fn generate_from_path(
		path: &str,
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, FileError> {
		let bytes = fs::read(path)?;
		Self::generate(&bytes, options)
	}
}

#[cfg(test)]
mod tests {
	use process::ImageResizeOptions;

	use super::*;
	use crate::filesystem::image::{
		tests::{get_test_jpg_path, get_test_png_path},
		ImageFormat, ImageProcessorOptions,
	};

	//JPG -> other Tests
	//JPG -> JPG
	#[test]
	fn test_generate_jpg_to_jpg() {
		let jpg_path = get_test_jpg_path();
		let options = ImageProcessorOptions {
			format: ImageFormat::Jpeg,
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
			format: ImageFormat::Jpeg,
			resize_options: Some(ImageResizeOptions::scaled(0.5, 0.5)),
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
			format: ImageFormat::Jpeg,
			resize_options: Some(ImageResizeOptions::sized(100f32, 100f32)),
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
			format: ImageFormat::Png,
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
			format: ImageFormat::Png,
			resize_options: Some(ImageResizeOptions::scaled(0.5, 0.5)),
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
			format: ImageFormat::Png,
			resize_options: Some(ImageResizeOptions::sized(100f32, 100f32)),
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
			format: ImageFormat::Webp,
			..Default::default()
		};

		let result = GenericImageProcessor::generate_from_path(&jpg_path, options);
		assert!(result.is_err());
		assert_eq!(
			result.unwrap_err().to_string(),
			"An unknown error occurred: Incorrect image processor for requested format."
		);
	}

	// PNG -> other
	// PNG -> PNG
	#[test]
	fn test_generate_png_to_png() {
		let png_path = get_test_png_path();
		let options = ImageProcessorOptions {
			format: ImageFormat::Png,
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
			format: ImageFormat::Png,
			resize_options: Some(ImageResizeOptions::scaled(0.5, 0.5)),
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
			format: ImageFormat::Png,
			resize_options: Some(ImageResizeOptions::sized(100f32, 100f32)),
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
			format: ImageFormat::Jpeg,
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
			format: ImageFormat::Jpeg,
			resize_options: Some(ImageResizeOptions::scaled(0.5, 0.5)),
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
			format: ImageFormat::Jpeg,
			resize_options: Some(ImageResizeOptions::sized(100f32, 100f32)),
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
