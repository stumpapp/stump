use zip::result::ZipError;

#[derive(Debug, thiserror::Error)]
pub enum ReadiumError {
	#[error("Failed to open epub: {0}")]
	EpubOpen(String),
	#[error("Failed to read epub: {0}")]
	EpubRead(String),
	#[error("Failed to build RWPM structure: {0}")]
	Builder(String),
	#[error("An IO error occurred: {0}")]
	Io(#[from] std::io::Error),
	#[error("A zip error occurred: {0}")]
	Zip(#[from] ZipError),
}
