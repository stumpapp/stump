use crate::filesystem::FileError;

#[derive(thiserror::Error, Debug)]
pub enum ProcessorError {
	#[error("{0}")]
	ImageError(#[from] image::ImageError),
	#[error("{0}")]
	FileError(#[from] FileError),
	#[error("The quality must be within the range of 0.0 to 100.0")]
	InvalidQuality,
	#[error("Explicitly sized images must have a height and width which are whole numbers greater than 0")]
	InvalidSizedImage,
	#[error("The processor configuration is invalid: {0}")]
	InvalidConfiguration(String),
	#[error("The image format is not supported")]
	UnsupportedImageFormat,
	#[error("An unknown error occurred: {0}")]
	UnknownError(String),
}

impl From<std::io::Error> for ProcessorError {
	fn from(value: std::io::Error) -> Self {
		Self::FileError(FileError::from(value))
	}
}
