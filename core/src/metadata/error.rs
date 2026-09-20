#[derive(Debug, thiserror::Error)]
pub enum MetadataError {
	#[error("An IO error occurred: {0}")]
	Io(#[from] std::io::Error),
	#[error("Failed to deserialize metadata: {0}")]
	Json(#[from] serde_json::Error),
}
