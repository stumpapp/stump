#[derive(Debug, thiserror::Error)]
pub enum MediaProcessorError {
	#[error("This file type is not supported: {0}")]
	UnsupportedFile(String),
}
