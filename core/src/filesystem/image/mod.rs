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
	ImageResizeOptions,
};
pub use thumbnail::*;

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
