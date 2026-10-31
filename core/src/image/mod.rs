//! Image processing utilities, including resizing, format conversion, and
//! thumbnail generation.
//!
//! The [`processor`] module is where the bulk of image loading and manipulation (resizing, etc)
//! is handled and feeds into [`thumbnail`] for the actual thumbnail operations

mod error;
mod process;
mod processor;
pub mod thumbnail;
pub mod utils;

pub use error::ImageProcessorError;
pub use process::{ImageProcessor, ImageProcessorOptionsExt};
pub use processor::{GenericImageProcessor, WebpProcessor};
pub use thumbnail::*;

use image::ImageFormat;
use models::shared::image_processor_options::{
	ScaledDimensionResize, SupportedImageFormat,
};
use tokio::task::spawn_blocking;

pub fn into_image_format(format: SupportedImageFormat) -> ImageFormat {
	match format {
		SupportedImageFormat::Jpeg => ImageFormat::Jpeg,
		SupportedImageFormat::Png => ImageFormat::Png,
		SupportedImageFormat::Webp => ImageFormat::WebP,
	}
}

fn resize_image_blocking(
	buf: &[u8],
	dimension: ScaledDimensionResize,
) -> Result<Vec<u8>, ImageProcessorError> {
	match image::guess_format(buf)? {
		ImageFormat::WebP => Ok(WebpProcessor::resize_scaled(buf, dimension)?),
		ImageFormat::Jpeg | ImageFormat::Png => {
			Ok(GenericImageProcessor::resize_scaled(buf, dimension)?)
		},
		_ => Err(ImageProcessorError::UnsupportedImageFormat),
	}
}

pub async fn resize_image(
	buf: Vec<u8>,
	dimension: ScaledDimensionResize,
) -> Result<Vec<u8>, ImageProcessorError> {
	spawn_blocking(move || resize_image_blocking(&buf, dimension))
		.await
		.map_err(|e| ImageProcessorError::Unknown(e.to_string()))?
}

#[cfg(test)]
pub(crate) mod tests {

	pub fn get_test_webp_path() -> String {
		::tests::fixtures::test_data_dir()
			.join("example.webp")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_jpg_path() -> String {
		::tests::fixtures::test_data_dir()
			.join("example.jpeg")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_png_path() -> String {
		::tests::fixtures::test_data_dir()
			.join("example.png")
			.to_string_lossy()
			.to_string()
	}
}
