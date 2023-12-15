use tokio::sync::mpsc;

use super::JobManagerCommand;

#[derive(Debug, thiserror::Error)]
pub enum JobManagerError {
	#[error("Error sending command not sent {0}")]
	CommandSendError(#[from] mpsc::error::SendError<JobManagerCommand>),
}
