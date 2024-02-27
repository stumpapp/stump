use lettre::transport::smtp;

pub type EmailResult<T> = Result<T, EmailError>;

#[derive(Debug, thiserror::Error)]
pub enum EmailError {
	#[error("Invalid email: {0}")]
	InvalidEmail(String),
	#[error("Failed to build email: {0}")]
	EmailBuildFailed(#[from] lettre::error::Error),
	#[error("Failed to send email: {0}")]
	SendFailed(#[from] smtp::Error),
}
