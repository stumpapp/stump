#[derive(Debug, thiserror::Error)]
pub enum JobError {
	#[error("A query error occurred: {0}")]
	QueryError(#[from] prisma_client_rust::QueryError),
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
