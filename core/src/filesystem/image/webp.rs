use crate::filesystem::error::FileError;

use super::{process::ImageProcessor, thumbnail::ThumbnailOptions};

pub struct WebpProcessor;

impl ImageProcessor for WebpProcessor {
	fn generate(path: &str) -> Result<Vec<u8>, FileError> {
		unimplemented!()
	}

	fn thumbnail(path: &str, options: ThumbnailOptions) -> Result<Vec<u8>, FileError> {
		unimplemented!()
	}
}
