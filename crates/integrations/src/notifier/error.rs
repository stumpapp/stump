pub type NotifierResult<T> = Result<T, NotifierError>;

#[derive(Debug, thiserror::Error)]
pub enum NotifierError {
	#[error("Request failed with error: {0}")]
	ReqwestError(#[from] reqwest::Error),
}
