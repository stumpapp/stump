#[derive(Debug, thiserror::Error)]
pub enum MediaProcessorError {
	#[error("A blocking task panicked or was canceled: {0}")]
	BlockingTask(#[from] tokio::task::JoinError),
	#[error("An IO error occurred: {0}")]
	Io(#[from] std::io::Error),
	#[error("This file type is not supported: {0}")]
	UnsupportedFile(String),
	#[error("A zip error occurred: {0}")]
	Zip(#[from] zip::result::ZipError),
}
