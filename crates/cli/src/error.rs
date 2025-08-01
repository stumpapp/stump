use stump_core::CoreError;

#[derive(Debug, thiserror::Error)]
pub enum CliError {
	#[error("{0}")]
	DialogError(#[from] dialoguer::Error),
	#[error("{0}")]
	OperationFailed(String),
	#[error("{0}")]
	DbError(#[from] sea_orm::error::DbErr),
	#[error("{0}")]
	Unknown(String),
}

impl From<CoreError> for CliError {
	fn from(err: CoreError) -> Self {
		CliError::Unknown(format!("{:?}", err))
	}
}

pub type CliResult<T> = Result<T, CliError>;
