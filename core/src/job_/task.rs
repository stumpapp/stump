use std::{pin::pin, sync::Arc};

use async_channel::Receiver;
use futures::{stream, StreamExt};
use futures_concurrency::stream::Merge;
use tokio::task::{JoinError, JoinHandle};

use super::{DynJob, JobError, WorkerCommand, WorkerCtx};

pub struct JobTaskOutput<J: DynJob> {
	pub data: J::Data,
	pub errors: Vec<String>,
}

pub struct JobTaskHandlerOutput<J: DynJob> {
	pub output: JobTaskOutput<J>,
	pub returned_ctx: Arc<WorkerCtx>,
}

pub type JobTaskResult<J> = Result<JobTaskOutput<J>, JobError>;
pub type JobTaskHandlerResult<J> = Result<JobTaskHandlerOutput<J>, JobError>;

enum StreamEvent<J: DynJob> {
	NewCommand(WorkerCommand),
	TaskCompleted(Result<JobTaskResult<J>, JoinError>),
}

pub(crate) async fn job_task_handler<J: DynJob>(
	worker_ctx: Arc<WorkerCtx>,
	mut task_handle: JoinHandle<JobTaskResult<J>>,
	commands_rx: Receiver<WorkerCommand>,
) -> JobTaskHandlerResult<J> {
	let task_stream = stream::once(&mut task_handle).map(StreamEvent::<J>::TaskCompleted);
	let command_stream = commands_rx.clone().map(StreamEvent::<J>::NewCommand);

	let mut stream = pin!((task_stream, command_stream).merge());

	// TODO: support pause/resume
	while let Some(event) = stream.next().await {
		match event {
			StreamEvent::TaskCompleted(Err(error)) => {
				tracing::error!(?error, "Error while executing task");
				return Err(JobError::Unknown(format!(
					"Error while executing task: {:?}",
					error.to_string()
				)));
			},
			StreamEvent::TaskCompleted(Ok(result)) => {
				let JobTaskOutput { data, errors } = result?;

				return Ok(JobTaskHandlerOutput {
					output: JobTaskOutput { data, errors },
					returned_ctx: worker_ctx,
				});
			},
			StreamEvent::NewCommand(cmd) => match cmd {
				WorkerCommand::Cancel(return_sender) => {
					task_handle.abort();
					let _ = task_handle.await;
					return_sender.send(()).map_or_else(
						|error| {
							tracing::error!(?error, "Failed to send cancel confirmation");
						},
						|_| tracing::trace!("Cancel confirmation sent"),
					);
					return Err(JobError::Cancelled);
				},
			},
		}
	}

	Err(JobError::Unknown(
		"Job task handler stream ended unexpectedly".to_string(),
	))
}
