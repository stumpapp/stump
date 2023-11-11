use prisma_client_rust::QueryError;

#[derive(Debug, thiserror::Error)]
pub enum CliError {
	#[error("{0}")]
	DialogError(#[from] dialoguer::Error),
	#[error("{0}")]
	OperationFailed(String),
	#[error("{0}")]
	QueryError(#[from] QueryError),
}

pub type CliResult<T> = Result<T, CliError>;
