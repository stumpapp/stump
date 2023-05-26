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
		let mut image = image::load_from_memory(buffer)?;

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
		let image = Reader::open(path)?.with_guessed_format()?.decode()?;
		Self::generate(image.as_bytes(), options)
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
