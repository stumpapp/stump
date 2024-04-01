use std::{sync::Arc, time::Instant};

use async_channel::Receiver;
use serde::Serialize;
use tokio::task::JoinHandle;

use super::{JobError, JobExecuteLog, JobExt, WorkerCommand, WorkerCtx};

/// The output of a job task
#[derive(Serialize, Debug)]
pub struct JobTaskOutput<J: JobExt> {
	pub output: J::Output,
	pub subtasks: Vec<J::Task>,
	pub logs: Vec<JobExecuteLog>,
}

/// The output of a job task handler function
pub struct JobTaskHandlerOutput<J: JobExt> {
	pub output: JobTaskOutput<J>,
	pub returned_ctx: Arc<WorkerCtx>,
}

pub type JobTaskResult<J> = Result<JobTaskOutput<J>, JobError>;
pub type JobTaskHandlerResult<J> = Result<JobTaskHandlerOutput<J>, JobError>;

/// A handler function for a single job task. This function pins the handle for the spawned task and
/// listens for commands from the worker
pub(crate) async fn job_task_handler<J: JobExt>(
	worker_ctx: Arc<WorkerCtx>,
	task_handle: JoinHandle<JobTaskResult<J>>,
	commands_rx: Receiver<WorkerCommand>,
) -> JobTaskHandlerResult<J> {
	let commands_rx_fut = commands_rx.recv();
	tokio::pin!(task_handle);
	tokio::pin!(commands_rx_fut);

	let start = Instant::now();
	loop {
		tokio::select! {
			task_result = &mut task_handle => {
				let elapsed_ms = start.elapsed().as_millis();
				match task_result {
					Ok(result) => {
						tracing::debug!(
							did_err = result.is_err(),
							?elapsed_ms,
							"Task output received"
						);
						let JobTaskOutput {
							output,
							logs,
							subtasks,
						} = result?;

						return Ok(JobTaskHandlerOutput {
							output: JobTaskOutput {
								output,
								logs,
								subtasks,
							},
							returned_ctx: worker_ctx,
						});
					}
					Err(join_error) => {
						tracing::error!(?join_error, ?elapsed_ms, "Error while executing task");
						return Err(JobError::Unknown(format!(
							"Error while executing task: {:?}",
							join_error.to_string()
						)));
					}
				}
			},
			Ok(cmd) = &mut commands_rx_fut => {
				tracing::debug!(?cmd, "Received command");
				match cmd {
					WorkerCommand::Cancel(return_sender) => {
						tracing::info!("Cancel signal received! Aborting task");
						task_handle.abort();
						let _ = task_handle.await;
						return Err(JobError::Cancelled(return_sender));
					},
					WorkerCommand::Pause => {
						worker_ctx.pause().await;
					}
					WorkerCommand::Resume => {
						worker_ctx.resume().await;
					}
				}
			},
		}
	}
}
