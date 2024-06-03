use std::fs;

use image::{imageops, io::Reader, DynamicImage, EncodableLayout, GenericImageView};
use webp::Encoder;

use crate::filesystem::{error::FileError, image::process::resized_dimensions};

use super::process::{ImageProcessor, ImageProcessorOptions, ImageResizeOptions};

pub struct WebpProcessor;

impl ImageProcessor for WebpProcessor {
	fn generate(
		buffer: &[u8],
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, FileError> {
		let mut image =
			image::load_from_memory_with_format(buffer, image::ImageFormat::WebP)?;

		if let Some(resize_options) = options.resize_options {
			let resized_image = WebpProcessor::resize_image(image, resize_options);
			image = resized_image;
		}

		let encoder = Encoder::from_image(&image)
			.map_err(|err| FileError::WebpEncodeError(err.to_string()))?;
		let encoded_webp = encoder.encode(100f32);

		Ok(encoded_webp.as_bytes().to_vec())
	}

	fn generate_from_path(
		path: &str,
		options: ImageProcessorOptions,
	) -> Result<Vec<u8>, FileError> {
		let bytes = fs::read(path)?;
		Self::generate(&bytes, options)
	}
}

impl WebpProcessor {
	fn resize_image(
		image: DynamicImage,
		resize_options: ImageResizeOptions,
	) -> DynamicImage {
		let (current_width, current_height) = image.dimensions();
		let (height, width) =
			resized_dimensions(current_height, current_width, resize_options);

		DynamicImage::ImageRgba8(imageops::resize(
			&image,
			width,
			height,
			// TODO: determine best filter
			imageops::FilterType::Triangle,
		))
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::image::ImageFormat;
	use std::{fs, path::PathBuf};

	#[test]
	fn test_generate_webp_from_data() {
		let bytes = get_test_webp_data();
		let options = ImageProcessorOptions {
			resize_options: None,
			format: ImageFormat::Webp,
			quality: None,
			page: None,
		};

		let image_processor = WebpProcessor::generate(&bytes, options);
		assert!(image_processor.is_ok());
	}

	#[test]
	fn test_generate_webp_from_path() {
		let webp_path = get_test_webp_path();
		let options = ImageProcessorOptions {
			resize_options: None,
			format: ImageFormat::Webp,
			quality: None,
			page: None,
		};

		let image_processor =
			WebpProcessor::generate_from_path(&webp_path, options).unwrap();
	}

	fn get_test_webp_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/example.webp")
			.to_string_lossy()
			.to_string()
	}

	fn get_test_webp_data() -> Vec<u8> {
		let path = get_test_webp_path();
		fs::read(path).expect("Failed to fetch example webp image")
	}
}
