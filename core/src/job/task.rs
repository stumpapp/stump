use std::{pin::pin, sync::Arc, time::Instant};

use async_channel::Receiver;
use futures::{stream, StreamExt};
use futures_concurrency::stream::Merge;
use serde::Serialize;
use tokio::task::{JoinError, JoinHandle};

use super::{JobError, JobExt, JobRunLog, WorkerCommand, WorkerCtx};

#[derive(Serialize, Debug)]
pub struct JobTaskOutput<J: JobExt> {
	pub data: J::Data,
	pub subtasks: Vec<J::Task>,
	pub errors: Vec<JobRunLog>,
}

pub struct JobTaskHandlerOutput<J: JobExt> {
	pub output: JobTaskOutput<J>,
	pub returned_ctx: Arc<WorkerCtx>,
}

pub type JobTaskResult<J> = Result<JobTaskOutput<J>, JobError>;
pub type JobTaskHandlerResult<J> = Result<JobTaskHandlerOutput<J>, JobError>;

enum StreamEvent<J: JobExt> {
	NewCommand(WorkerCommand),
	TaskCompleted(Result<JobTaskResult<J>, JoinError>),
}

pub(crate) async fn job_task_handler<J: JobExt>(
	worker_ctx: Arc<WorkerCtx>,
	mut task_handle: JoinHandle<JobTaskResult<J>>,
	commands_rx: Receiver<WorkerCommand>,
) -> JobTaskHandlerResult<J> {
	let task_stream = stream::once(&mut task_handle).map(StreamEvent::<J>::TaskCompleted);
	let command_stream = commands_rx.clone().map(StreamEvent::<J>::NewCommand);

	let mut stream = pin!((task_stream, command_stream).merge());

	let start = Instant::now();
	// TODO: support pause/resume
	while let Some(event) = stream.next().await {
		match event {
			StreamEvent::TaskCompleted(Err(error)) => {
				let elapsed_ms = start.elapsed().as_millis();
				tracing::error!(?error, ?elapsed_ms, "Error while executing task");
				return Err(JobError::Unknown(format!(
					"Error while executing task: {:?}",
					error.to_string()
				)));
			},
			StreamEvent::TaskCompleted(Ok(result)) => {
				let elapsed_ms = start.elapsed().as_millis();
				tracing::debug!(
					did_err = result.is_err(),
					?elapsed_ms,
					"Task output received"
				);
				let JobTaskOutput {
					data,
					errors,
					subtasks,
				} = result?;

				return Ok(JobTaskHandlerOutput {
					output: JobTaskOutput {
						data,
						errors,
						subtasks,
					},
					returned_ctx: worker_ctx,
				});
			},
			StreamEvent::NewCommand(cmd) => {
				tracing::debug!(?cmd, "Received command");
				match cmd {
					WorkerCommand::Cancel(return_sender) => {
						tracing::info!("Cancel signal received! Aborting task");
						task_handle.abort();
						let _ = task_handle.await;
						return_sender.send(()).map_or_else(
							|error| {
								tracing::error!(
									?error,
									"Failed to send cancel confirmation"
								);
							},
							|_| tracing::trace!("Cancel confirmation sent"),
						);
						return Err(JobError::Cancelled);
					},
				}
			},
		}
	}

	Err(JobError::Unknown(
		"Job task handler stream ended unexpectedly".to_string(),
	))
}
