mod error;
mod generic;
mod process;
mod thumbnail;
mod webp;

// TODO: replace errors with ProcessorError throughout the module

pub use self::webp::WebpProcessor;
pub use error::ProcessorError;
pub use generic::GenericImageProcessor;
pub use process::{
	ImageFormat, ImageProcessor, ImageProcessorOptions, ImageResizeMode,
	ImageResizeOptions, ScaledDimensionResize,
};
pub use thumbnail::*;

pub async fn resize_image(
	buf: Vec<u8>,
	dimension: ScaledDimensionResize,
) -> Result<Vec<u8>, ProcessorError> {
	let kind = image::guess_format(&buf)?;
	match kind {
		image::ImageFormat::WebP => WebpProcessor::resize_scaled(buf, dimension),
		image::ImageFormat::Jpeg | ImageFormat::Png => {
			GenericImageProcessor::resize_scaled(buf, dimension)
		},
		// ImageFormat::Avif => AvifProcessor::new(),
		// ImageFormat::JpegXl => JxlProcessor::new(),
		_ => return Err(ProcessorError::UnsupportedImageFormat),
	}
}

#[cfg(test)]
mod tests {
	use std::path::PathBuf;

	pub fn get_test_webp_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/example.webp")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_jpg_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/example.jpeg")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_png_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/example.png")
			.to_string_lossy()
			.to_string()
	}

	// pub fn get_test_avif_path() -> String {
	// 	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
	// 		.join("integration-tests/data/example.avif")
	// 		.to_string_lossy()
	// 		.to_string()
	// }

	// TODO(339): Avif + Jxl support
	// pub fn get_test_jxl_path() -> String {
	// 	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
	// 		.join("integration-tests/data/example.jxl")
}
