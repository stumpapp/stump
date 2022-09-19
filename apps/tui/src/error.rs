use thiserror::Error;

#[derive(Debug, Error)]
pub enum CliError {}

#[derive(Debug, Error)]
pub enum TuiError {
	#[error("An IO error occurred: {0}")]
	IoError(#[from] std::io::Error),

	#[error("An error occurred: {0}")]
	Unknown(String),
}

impl From<CliError> for TuiError {
	fn from(_error: CliError) -> Self {
		unimplemented!()
	}
}
