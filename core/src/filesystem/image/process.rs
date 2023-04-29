use crate::filesystem::error::FileError;

use super::thumbnail::ThumbnailOptions;

/// Trait defining a standard API for processing images throughout Stump.
pub trait ImageProcessor {
	/// Generate an image from the given path in the filesystem. The file
	/// must already be an image, and will be converted to the processor's
	/// target format if necessary.
	fn generate(path: &str) -> Result<Vec<u8>, FileError>;

	/// Generate a thumbnail from the given path in the filesystem. The file
	/// must already be an image, and will be converted to the processor's
	/// target format if necessary.
	fn thumbnail(path: &str, options: ThumbnailOptions) -> Result<Vec<u8>, FileError>;
}
