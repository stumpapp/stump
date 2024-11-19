pub type NotifierResult<T> = Result<T, NotifierError>;

#[derive(Debug, thiserror::Error)]
pub enum NotifierError {
	#[error("Request failed with error: {0}")]
	ReqwestError(#[from] reqwest::Error),
	#[error("{0}")]
	Unimplemented(String),
	#[error("Request was unsuccessful")]
	RequestFailed(String),
}
