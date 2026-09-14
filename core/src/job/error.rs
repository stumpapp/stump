use models::error::EntityError;
use sea_orm;

use crate::{filesystem::error::FileError, CoreError};

#[derive(Debug, thiserror::Error)]
pub enum JobError {
	#[error("Job failed while initializing: {0}")]
	InitFailed(String),
	#[error("Save state failed to be deserialized: {0}")]
	StateLoadFailed(String),
	#[error("Save state failed to be serialized: {0}")]
	StateSaveFailed(String),
	#[error("Job was cancelled")]
	Cancelled,
	#[error("A task experienced a critical error while executing: {0}")]
	TaskFailed(String),
	#[error("A query error occurred: {0}")]
	DbError(#[from] sea_orm::error::DbErr),
	#[error("A file error occurred: {0}")]
	FileError(#[from] FileError),
	#[error("An unknown error occurred: {0}")]
	Unknown(String),
}

impl From<EntityError> for JobError {
	fn from(err: EntityError) -> Self {
		Self::Unknown(err.to_string())
	}
}

impl From<CoreError> for JobError {
	fn from(err: CoreError) -> Self {
		match err {
			CoreError::DBError(err) => Self::DbError(err),
			_ => Self::Unknown(err.to_string()),
		}
	}
}
