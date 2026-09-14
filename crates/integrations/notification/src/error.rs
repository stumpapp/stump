pub type NotificationResult<T> = Result<T, NotificationError>;

#[derive(Debug, thiserror::Error)]
pub enum NotificationError {
	#[error("Request failed with error: {0}")]
	ReqwestError(#[from] reqwest::Error),
	#[error("{0}")]
	Unimplemented(String),
	#[error("Request was unsuccessful")]
	RequestFailed(String),
}
