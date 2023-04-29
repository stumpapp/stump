use std::io::Cursor;

use image::{imageops, io::Reader, DynamicImage, GenericImageView, ImageFormat};

use crate::filesystem::{image::process::resized_dimensions, FileError};

use super::{
	process::ImageProcessor,
	thumbnail::{ThumbnailFormat, ThumbnailOptions},
};

/// An image processor that works for the most common image types, primarily
/// JPEG and PNG formats.
pub struct GenericImageProcessor;

impl ImageProcessor for GenericImageProcessor {
	fn generate(buffer: &[u8]) -> Result<Vec<u8>, FileError> {
		let image = image::load_from_memory(buffer)?;

		let mut buffer = Cursor::new(vec![]);
		image.write_to(&mut buffer, ImageFormat::Jpeg)?;

		Ok(buffer.into_inner())
	}

	fn generate_from_path(path: &str) -> Result<Vec<u8>, FileError> {
		let image = Reader::open(path)?.with_guessed_format()?.decode()?;

		let mut buffer = Cursor::new(vec![]);
		image.write_to(&mut buffer, ImageFormat::Jpeg)?;

		Ok(buffer.into_inner())
	}

	fn generate_thumbnail(
		path: &str,
		options: ThumbnailOptions,
	) -> Result<Vec<u8>, FileError> {
		let base_image = Reader::open(path)?.with_guessed_format()?.decode()?;

		let (current_width, current_height) = base_image.dimensions();
		let (height, width) =
			resized_dimensions(current_height, current_width, options.size_factor);

		let resized_image = DynamicImage::ImageRgba8(imageops::resize(
			&base_image,
			width,
			height,
			// TODO: determine best filter
			imageops::FilterType::Triangle,
		));

		let format = match options.format {
			ThumbnailFormat::Jpeg => Ok(ImageFormat::Jpeg),
			ThumbnailFormat::Png => Ok(ImageFormat::Png),
			_ => Err(FileError::UnknownError(String::from(
				"Internal error, using incorrect image process for format.",
			))),
		}?;

		let mut buffer = Cursor::new(vec![]);
		resized_image.write_to(&mut buffer, format)?;

		Ok(buffer.into_inner())
	}
}
