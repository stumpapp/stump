#[derive(thiserror::Error, Debug)]
pub enum ImageProcessorError {
	#[error("{0}")]
	Image(#[from] image::ImageError),
	#[error("{0}")]
	Io(#[from] std::io::Error),
	#[error("Failed to encode image to WebP: {0}")]
	WebpEncode(String),
	#[error("Incorrect image processor for the requested format")]
	IncorrectProcessor,
	#[error("The quality must be within the range of 0.0 to 100.0")]
	InvalidQuality,
	#[error("Explicitly sized images must have a height and width which are whole numbers greater than 0")]
	InvalidSizedImage,
	#[error("The processor configuration is invalid: {0}")]
	InvalidConfiguration(String),
	#[error("The image format is not supported")]
	UnsupportedImageFormat,
	#[error("An unknown error occurred: {0}")]
	Unknown(String),
}
