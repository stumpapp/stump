use crate::CoreError;

#[derive(Debug, thiserror::Error)]
pub enum JobError {
	#[error("Job failed while initializing: {0}")]
	InitFailed(String),
	#[error("Save state failed to be deserialized: {0}")]
	StateDeserializeFailed(String),
	#[error("A query error occurred: {0}")]
	QueryError(#[from] prisma_client_rust::QueryError),
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
	// #[error("An communication error occurred {0}")]
	// IPCError(#[from] broadcast::error::SendError<JobManagerShutdownSignal>),
	#[error("Worker not found {0}")]
	WorkerNotFound(String),
	#[error("Worker is in invalid state {0}")]
	WorkerInvalidState(String),
	#[error("Worker spawn failed")]
	WorkerSpawnFailed,
	#[error("Job with ID not found: {0}")]
	JobNotFound(String),
	#[error("Job missing ID")]
	JobMissingId,
	#[error("A query error occurred {0}")]
	QueryError(#[from] prisma_client_rust::QueryError),
	#[error("An unknown error occurred {0}")]
	Unknown(String),
}
