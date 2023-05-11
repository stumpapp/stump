use std::io::Cursor;

use image::{imageops, io::Reader, DynamicImage, GenericImageView, ImageFormat};

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
				resized_dimensions(current_height, current_width, resize_options);

			let resized_image = DynamicImage::ImageRgba8(imageops::resize(
				&image,
				width,
				height,
				// TODO: determine best filter
				imageops::FilterType::Triangle,
			));
			image = resized_image;
		}

		let format = match options.format {
			process::ImageFormat::Jpeg => Ok(ImageFormat::Jpeg),
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
		let image = Reader::open(path)?.with_guessed_format()?.decode()?;
		Self::generate(image.as_bytes(), options)
	}
}
