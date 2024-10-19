use prisma_client_rust::QueryError;
use stump_core::CoreError;

#[derive(Debug, thiserror::Error)]
pub enum CliError {
	#[error("{0}")]
	DialogError(#[from] dialoguer::Error),
	#[error("{0}")]
	OperationFailed(String),
	#[error("{0}")]
	QueryError(#[from] Box<QueryError>),
	#[error("{0}")]
	Unknown(String),
}

impl From<CoreError> for CliError {
	fn from(err: CoreError) -> Self {
		match err {
			CoreError::QueryError(err) => CliError::QueryError(err),
			_ => CliError::Unknown(format!("{:?}", err)),
		}
	}
}

impl From<prisma_client_rust::QueryError> for CliError {
	fn from(error: prisma_client_rust::QueryError) -> Self {
		Self::QueryError(Box::new(error))
	}
}

pub type CliResult<T> = Result<T, CliError>;
