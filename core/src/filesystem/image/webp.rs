use image::{imageops, io::Reader, DynamicImage, EncodableLayout, GenericImageView};
use webp::Encoder;

use crate::filesystem::{error::FileError, image::process::resized_dimensions};

use super::{
	process::ImageProcessor,
	thumbnail::{ThumbnailOptions, ThumbnailSizeFactor},
};

pub struct WebpProcessor;

impl ImageProcessor for WebpProcessor {
	fn generate(buffer: &[u8]) -> Result<Vec<u8>, FileError> {
		let image = image::load_from_memory(buffer)?;

		let encoder = Encoder::from_image(&image)
			.map_err(|err| FileError::WebpEncodeError(err.to_string()))?;
		let encoded_webp = encoder.encode(100f32);

		Ok(encoded_webp.as_bytes().to_vec())
	}

	fn generate_from_path(path: &str) -> Result<Vec<u8>, FileError> {
		let image = Reader::open(path)?.with_guessed_format()?.decode()?;

		let encoder = Encoder::from_image(&image)
			.map_err(|err| FileError::WebpEncodeError(err.to_string()))?;
		let encoded_webp = encoder.encode(100f32);

		Ok(encoded_webp.as_bytes().to_vec())
	}

	fn generate_thumbnail(
		buffer: &[u8],
		options: ThumbnailOptions,
	) -> Result<Vec<u8>, FileError> {
		let base_image = image::load_from_memory(buffer)?;
		let resized_image = WebpProcessor::resize_image(base_image, options.size_factor);

		let encoder = Encoder::from_image(&resized_image)
			.map_err(|err| FileError::WebpEncodeError(err.to_string()))?;
		// TODO: make the quality option configurable
		let encoded_webp = encoder.encode(100f32);

		Ok(encoded_webp.as_bytes().to_vec())
	}

	fn generate_thumbnail_from_path(
		path: &str,
		options: ThumbnailOptions,
	) -> Result<Vec<u8>, FileError> {
		let base_image = Reader::open(path)?.with_guessed_format()?.decode()?;
		let resized_image = WebpProcessor::resize_image(base_image, options.size_factor);

		let encoder = Encoder::from_image(&resized_image)
			.map_err(|err| FileError::WebpEncodeError(err.to_string()))?;
		// TODO: make the quality option configurable
		let encoded_webp = encoder.encode(100f32);

		Ok(encoded_webp.as_bytes().to_vec())
	}
}

impl WebpProcessor {
	fn resize_image(
		image: DynamicImage,
		size_factor: ThumbnailSizeFactor,
	) -> DynamicImage {
		let (current_width, current_height) = image.dimensions();
		let (height, width) =
			resized_dimensions(current_height, current_width, size_factor);

		DynamicImage::ImageRgba8(imageops::resize(
			&image,
			width,
			height,
			// TODO: determine best filter
			imageops::FilterType::Triangle,
		))
	}
}
