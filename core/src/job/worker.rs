use std::{
	sync::Arc,
	time::{Duration, Instant},
};

use models::entity::job;
use sea_orm::{prelude::*, DatabaseConnection};
use tokio::sync::{broadcast, mpsc, oneshot};

use crate::{
	config::StumpConfig,
	event::{self, CoreEvent},
	job::{JobError, JobStatus},
};

use super::{Executor, JobControllerCommand, JobManager, JobProgress, JobUpdate};

/// An enum representing the various types of _external_ messages that a worker can send, excluding
/// internal commands and state events.
pub enum WorkerSend {
	ManagerCommand(JobControllerCommand),
	Progress(JobProgress),
	Event(CoreEvent),
}

/// A trait for extending the `WorkerSend` enum with a method to convert it into a `WorkerSend`
pub trait WorkerSendExt {
	fn into_worker_send(self) -> WorkerSend;
}

// TODO: Add Finalizing state to inform clients that a job is not able to be paused
/// The status of the worker, either running or paused.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkerStatus {
	Running,
	Paused,
	// Finalizing
}

/// An enum representing the types of status-related events that the worker can send/receive. This
/// is primarily used to support pausing and resuming jobs.
#[derive(Debug)]
pub enum WorkerStatusEvent {
	StatusChange(WorkerStatus),
	StatusRequested(oneshot::Sender<WorkerStatus>),
}

/// Commands that the worker can send/receive internally. Every command will kill
/// the Future that effectively runs the job. Currently, the only command is `Cancel`.
#[derive(Debug)]
pub enum WorkerCommand {
	Cancel(oneshot::Sender<()>),
	Pause,
	Resume,
}

/// The context that is passed to the worker when it is created. This context is used
/// throughout the lifetime of a worker and its job.
#[derive(Clone)]
pub struct WorkerCtx {
	/// The ID of the job that the worker is running
	pub job_id: String,
	/// A pointer to the prisma client
	pub conn: Arc<DatabaseConnection>,
	/// A pointer to the stump configuration
	pub config: Arc<StumpConfig>,
	/// A sender for the core event channel
	pub core_event_tx: broadcast::Sender<CoreEvent>,
	/// A receiver for the worker commands
	pub commands_rx: async_channel::Receiver<WorkerCommand>,
	/// A sender for the worker to send commands to the job manager
	pub job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
	/// A sender for the [`WorkerCtx`] to send status events to the loop which
	/// is managing the corresponding worker
	pub status_tx: async_channel::Sender<WorkerStatusEvent>,
}

impl WorkerCtx {
	/// Emit a [`CoreEvent`] to any clients listening to the server that a job has started
	pub fn report_started(&self) {
		let send_result =
			self.core_event_tx
				.send(CoreEvent::JobStarted(event::JobStarted {
					id: self.job_id.clone(),
				}));
		if let Err(send_error) = send_result {
			tracing::error!(?send_error, "Failed to send started event");
		}
	}

	/// Emit a [`CoreEvent`] to any clients listening to the server
	pub fn report_progress(&self, payload: JobProgress) {
		let send_result = self.core_event_tx.send(CoreEvent::JobUpdate(JobUpdate {
			id: self.job_id.clone(),
			payload,
		}));
		if let Err(send_error) = send_result {
			tracing::error!(?send_error, "Failed to send progress event");
		}
	}

	/// Send a command to the [`super::JobManager`]
	pub fn send_manager_command(&self, command: JobControllerCommand) {
		self.job_controller_tx.send(command).map_or_else(
			|error| {
				tracing::error!(?error, "Failed to send command to job manager");
			},
			|_| {
				tracing::trace!("Command sent to job manager");
			},
		);
	}

	pub fn send_core_event(&self, event: CoreEvent) {
		self.core_event_tx.send(event).map_or_else(
			|error| {
				tracing::error!(?error, "Failed to send event");
			},
			|_| {
				tracing::trace!("Event sent");
			},
		);
	}

	/// Send a batch of [`WorkerSend`] to the appropriate handlers
	///
	/// Note that this isn't _really_ batching on the send side, rather just providing
	/// a convenient interface for providing multiple send operations at once.
	pub fn send_batch(&self, batch: Vec<WorkerSend>) {
		for item in batch {
			match item {
				WorkerSend::ManagerCommand(cmd) => {
					self.send_manager_command(cmd);
				},
				WorkerSend::Progress(progress) => {
					self.report_progress(progress.clone());
				},
				WorkerSend::Event(ev) => {
					self.send_core_event(ev);
				},
			}
		}
	}

	/// Send a status request to the worker loop and await the response
	///
	/// Note that in the case of a failure to send the status request, the method will
	/// return `WorkerStatus::Running` as a guess. This isn't overly ideal, but I will
	/// revisit this in the future.
	pub async fn get_status(&self) -> WorkerStatus {
		// Try 3 times to send the status request with an acknowledgement
		for _ in 0..3 {
			let (tx, rx) = oneshot::channel();

			let send_succeeded = self
				.status_tx
				.send(WorkerStatusEvent::StatusRequested(tx))
				.await
				.is_ok();

			if send_succeeded {
				return rx.await.unwrap_or(WorkerStatus::Running);
			}
		}

		tracing::warn!(
			"Failed to send status request 3 times. Returning running status as a guess..."
		);

		WorkerStatus::Running
	}

	/// Send a pause request to the worker loop
	///
	/// Note that this method will attempt to send the pause request 3 times before
	/// giving up.
	pub async fn pause(&self) {
		// Try 3 times to send the state request with an acknowledgement
		for _ in 0..3 {
			let send_succeeded = self
				.status_tx
				.send(WorkerStatusEvent::StatusChange(WorkerStatus::Paused))
				.await
				.is_ok();

			if send_succeeded {
				return;
			}
		}

		tracing::warn!("Failed to send pause request 3 times. Giving up...");
	}

	/// Send a resume request to the worker loop
	///
	/// Note that this method will attempt to send the resume request 3 times before
	/// giving up.
	pub async fn resume(&self) {
		// Try 3 times to send the status request with an acknowledgement
		for _ in 0..3 {
			let send_succeeded = self
				.status_tx
				.send(WorkerStatusEvent::StatusChange(WorkerStatus::Running))
				.await
				.is_ok();

			if send_succeeded {
				return;
			}
		}

		tracing::warn!("Failed to send resume request 3 times. Giving up...");
	}
}

/// An instance of a running job, represented by a worker. The worker is responsible for
/// kicking off the job and managing its lifecycle.
pub struct Worker {
	/// The sender through which the worker can send commands to itself. The corresponding
	/// receiver is stored in the worker context.
	commands_tx: async_channel::Sender<WorkerCommand>,
}

impl Worker {
	/// Create a new worker instance and its context
	fn new(
		job_id: &str,
		conn: Arc<DatabaseConnection>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
		job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
	) -> Result<(Self, WorkerCtx, async_channel::Receiver<WorkerStatusEvent>), JobError>
	{
		let (commands_tx, commands_rx) = async_channel::unbounded::<WorkerCommand>();
		let (status_tx, status_rx) = async_channel::unbounded::<WorkerStatusEvent>();

		let worker_ctx = WorkerCtx {
			job_id: job_id.to_string(),
			conn,
			config,
			core_event_tx,
			commands_rx,
			job_controller_tx,
			status_tx,
		};

		Ok((Self { commands_tx }, worker_ctx, status_rx))
	}

	/// Create a new [Worker] instance and immediately spawn it. This is the main entry point
	/// for creating a _running_ worker.
	///
	/// Note that workers are _only_ supported to be in a running state. A worker should
	/// not be created if it is not intended to be running.
	pub async fn create_and_spawn(
		job: Box<dyn Executor>,
		manager: Arc<JobManager>,
		conn: Arc<DatabaseConnection>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
		job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
	) -> Result<Arc<Self>, JobError> {
		let job_id = job.id().to_string();
		let (worker, worker_ctx, status_rx) = Worker::new(
			job_id.as_str(),
			conn.clone(),
			config,
			core_event_tx,
			job_controller_tx,
		)?;
		let worker = worker.arced();

		let affected_rows = job::Entity::update_many()
			.filter(job::Column::Id.eq(job_id))
			.col_expr(
				job::Column::Status,
				Expr::value(JobStatus::Running.to_string()),
			)
			.exec(conn.as_ref())
			.await?
			.rows_affected;

		if affected_rows == 0 {
			tracing::error!("Failed to update job status to running");
			return Err(JobError::InitFailed(
				"Failed to update job status to running".to_string(),
			));
		}

		let worker_manager = WorkerManager {
			status: WorkerStatus::Running,
			worker_ctx: worker_ctx.clone(),
			status_rx,
			manager: manager.clone(),
		};
		tokio::spawn(worker_manager.main_loop(job));

		Ok(worker)
	}

	/// A convenience method to wrap the worker in an Arc
	fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	/// Send a pause command to the worker manager
	pub async fn pause(&self) {
		self.commands_tx
			.send(WorkerCommand::Pause)
			.await
			.map_or_else(
				|error| {
					tracing::error!(?error, "Error while sending pause command");
				},
				|_| {
					tracing::trace!("Pause command sent");
				},
			);
	}

	/// Send a resume command to the worker manager
	pub async fn resume(&self) {
		self.commands_tx
			.send(WorkerCommand::Resume)
			.await
			.map_or_else(
				|error| {
					tracing::error!(?error, "Error while sending resume command");
				},
				|_| {
					tracing::trace!("Resume command sent");
				},
			);
	}

	/// Cancels the job running in the worker
	pub async fn cancel(&self) {
		let (tx, rx) = oneshot::channel();

		let send_received = self
			.commands_tx
			.send(WorkerCommand::Cancel(tx))
			.await
			.is_ok();

		if send_received {
			rx.await.map_or_else(
				|error| {
					tracing::error!(
						?error,
						"Error while waiting for cancel confirmation"
					);
				},
				|_| {
					tracing::trace!("Received cancel confirmation");
				},
			);
		} else {
			tracing::error!("Failed to send cancel signal to worker");
		}
	}
}

/// A helper struct to manage the worker's status and lifecycle. This struct is responsible for
/// kicking off the [Executor] and watching for status changes and commands.
struct WorkerManager {
	/// The current status of the worker which is being managed/monitored
	status: WorkerStatus,
	/// The context that was provided to the worker when it was created
	worker_ctx: WorkerCtx,
	/// A receiver for status events, which are used to pause/resume the worker
	status_rx: async_channel::Receiver<WorkerStatusEvent>,
	/// A pointer to the job manager, which is used to complete the job once it's done
	manager: Arc<JobManager>,
}

impl WorkerManager {
	/// The main worker loop. This is where the job is run and the worker listens for
	/// commands to cancel the job.
	async fn main_loop(mut self, mut executor: Box<dyn Executor>) {
		let job_id = executor.id().to_string();
		let loop_ctx = self.worker_ctx.clone();
		let finalizer_ctx = loop_ctx.clone();

		self.status = WorkerStatus::Running;
		let status_rx_fut = self.status_rx.recv();

		// Note: we cannot use an Arc here because the executor.execute method
		// requires a mutable reference to the executor. So instead we just return
		// the executor and the result of the execution once it's done.
		let executor_handle = tokio::spawn(async move {
			let result = executor.execute(loop_ctx).await;
			(executor, result)
		});

		tokio::pin!(status_rx_fut);
		tokio::pin!(executor_handle);

		let start = Instant::now();
		loop {
			tokio::select! {
				executor_result = &mut executor_handle => {
					let elapsed = start.elapsed();
					match executor_result {
						Ok((returned_executor, result)) => {
							tracing::debug!(
								did_err = result.is_err(),
								?elapsed,
								"Task output received"
							);
							match result {
								Ok(mut output) => {
									tracing::info!("Job completed successfully!");
									finalizer_ctx.report_progress(JobProgress::finished());
									let next_job = output.next_job.take();
									let result = returned_executor
											.persist_output(finalizer_ctx.clone(), output, elapsed)
											.await;
									tracing::trace!(?result, "Output persisted?");
									if let Some(next_job) = next_job {
										finalizer_ctx.send_manager_command(JobControllerCommand::EnqueueJob(next_job));
									}
								},
								Err(error) => {
									tracing::error!(?error, "Job failed with critical error");
									finalizer_ctx.report_progress(JobProgress::status_msg(
										JobStatus::Failed,
										&format!("Job failed: {error}"),
									));

									let result = returned_executor
										.persist_failure(
											finalizer_ctx,
											JobStatus::Failed,
											elapsed,
										)
										.await;
									tracing::trace!(?result, "Failure persisted?");

									if let JobError::Cancelled(return_tx) = error {
										return_tx.send(()).map_or_else(
											|error| {
												tracing::error!(
													?error,
													"Failed to send cancel confirmation"
												);
											},
											|_| {
												tracing::trace!("Cancel confirmation sent");
											},
										);
									} else if returned_executor.should_requeue() {
										// TODO: requeue the job
									}
								},
							}
						},
						Err(join_error) => {
							// TODO: should log the error to DB? Or force people to find context via log file?
							tracing::error!(?join_error, ?elapsed, "Error while joining job worker thread");
							finalizer_ctx.report_progress(JobProgress::status_msg(
								JobStatus::Failed,
								&format!("Job failed: {join_error}"),
							));
							let _ = handle_failure_status(job_id.clone(), JobStatus::Failed, &finalizer_ctx.conn, elapsed).await;
						}
					}
					return self.manager.complete(job_id).await;
				},

				Ok(status_event) = &mut status_rx_fut => {
					match status_event {
						WorkerStatusEvent::StatusChange(new_status) if new_status != self.status => {
							// TODO: should we track idle times?
							tracing::debug!(status = ?self.status, ?new_status, "Status change event received");
							self.status = new_status;
						},
						WorkerStatusEvent::StatusRequested(sender) => {
							tracing::trace!("Status requested");
							sender.send(self.status).map_or_else(
								|error| {
									tracing::error!(?error, "Failed to send status!");
								},
								|status| {
									tracing::trace!(?status, "status sent");
								},
							);
						},
						_ => {
							tracing::warn!(?status_event, "Ignoring status event. Most likely a status change to the same status");
						}
					}
				},
			}
		}
	}
}

/// Update the job status to the provided status in the database
pub(crate) async fn handle_failure_status(
	job_id: String,
	status: JobStatus,
	conn: &DatabaseConnection,
	elapsed: Duration,
) -> Result<(), JobError> {
	let update_result = job::Entity::update_many()
		.filter(job::Column::Id.eq(job_id.clone()))
		.col_expr(
			job::Column::Status,
			Expr::value(status.to_string()),
		)
		.col_expr(
			job::Column::MsElapsed,
			Expr::value(
				elapsed.as_millis().try_into().unwrap_or_else(|e| {
					tracing::error!(error = ?e, "Wow! You defied logic and overflowed an i64 during the attempt to convert job duration to milliseconds. It must have been a long 292_471_208 years!");
					i64::MAX
				}),
			),
		)
		.exec(conn)
		.await;

	if let Err(error) = update_result {
		tracing::error!(?error, ?status, "Failed to update job status");
	}

	Ok(())
}
