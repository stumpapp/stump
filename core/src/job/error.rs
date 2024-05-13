use tokio::sync::oneshot;

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
	Cancelled(oneshot::Sender<()>),
	#[error("A task experienced a critical error while executing: {0}")]
	TaskFailed(String),
	#[error("A query error occurred: {0}")]
	QueryError(#[from] prisma_client_rust::QueryError),
	#[error("A file error occurred: {0}")]
	FileError(#[from] FileError),
	#[error("An unknown error occurred: {0}")]
	Unknown(String),
}

impl From<CoreError> for JobError {
	fn from(err: CoreError) -> Self {
		match err {
			CoreError::QueryError(err) => JobError::QueryError(err),
			_ => JobError::Unknown(err.to_string()),
		}
	}
}

#[derive(Debug, thiserror::Error)]
pub enum JobManagerError {
	#[error("Worker not found {0}")]
	WorkerNotFound(String),
	#[error("Worker is in invalid state {0}")]
	WorkerInvalidState(String),
	#[error("Worker spawn failed")]
	WorkerSpawnFailed,
	#[error("Job with ID already exists: {0}")]
	JobAlreadyExists(String),
	#[error("Job with ID not found: {0}")]
	JobNotFound(String),
	#[error("Job missing ID")]
	JobMissingId,
	#[error("Job failed to be persisted: {0}")]
	JobPersistFailed(String),
	#[error("A job was found which was in a deeply invalid state")]
	JobLostError,
	#[error("A query error occurred {0}")]
	QueryError(#[from] prisma_client_rust::QueryError),
	#[error("An unknown error occurred {0}")]
	Unknown(String),
}

impl From<JobError> for JobManagerError {
	fn from(job_error: JobError) -> Self {
		match job_error {
			JobError::QueryError(e) => JobManagerError::QueryError(e),
			_ => JobManagerError::Unknown(job_error.to_string()),
		}
	}
}
