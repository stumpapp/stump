mod error;
mod generic;
mod process;
mod thumbnail;
mod webp;

pub use self::webp::WebpProcessor;
pub use error::ProcessorError;
pub use generic::GenericImageProcessor;
pub use process::{
	ImageFormat, ImageProcessor, ImageProcessorOptions, ImageResizeMode,
	ImageResizeOptions, ScaledDimensionResize,
};
pub use thumbnail::*;
use tokio::{sync::oneshot, task::spawn_blocking};

fn _resize_image(
	buf: &[u8],
	dimension: ScaledDimensionResize,
) -> Result<Vec<u8>, ProcessorError> {
	let kind = image::guess_format(buf)?;
	match kind {
		image::ImageFormat::WebP => Ok(WebpProcessor::resize_scaled(buf, dimension)?),
		image::ImageFormat::Jpeg | image::ImageFormat::Png => {
			Ok(GenericImageProcessor::resize_scaled(buf, dimension)?)
		},
		_ => Err(ProcessorError::UnsupportedImageFormat),
	}
}

pub async fn resize_image(
	buf: Vec<u8>,
	dimension: ScaledDimensionResize,
) -> Result<Vec<u8>, ProcessorError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		move || {
			let send_result = tx.send(_resize_image(&buf, dimension));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of resize_image"
			);
		}
	});

	let resized_image = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| ProcessorError::UnknownError(e.to_string()))?;
		return Err(ProcessorError::UnknownError(
			"Failed to receive resized image".to_string(),
		));
	};

	Ok(resized_image)
}

#[cfg(test)]
mod tests {
	use std::path::PathBuf;

	pub fn get_test_webp_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("tests/data/example.webp")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_jpg_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("tests/data/example.jpeg")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_png_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("tests/data/example.png")
			.to_string_lossy()
			.to_string()
	}

	// pub fn get_test_avif_path() -> String {
	// 	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
	// 		.join("tests/data/example.avif")
	// 		.to_string_lossy()
	// 		.to_string()
	// }

	// TODO(339): Avif + Jxl support
	// pub fn get_test_jxl_path() -> String {
	// 	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
	// 		.join("tests/data/example.jxl")
}
