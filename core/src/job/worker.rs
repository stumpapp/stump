use std::{
	sync::Arc,
	time::{Duration, Instant},
};

use tokio::{
	sync::{broadcast, mpsc, oneshot},
	task::spawn,
};

use crate::{
	config::StumpConfig,
	event::CoreEvent,
	job::{JobError, JobStatus},
	prisma::{job, PrismaClient},
};

use super::{Executor, JobControllerCommand, JobManager, JobProgress, JobUpdate};

// pub enum WorkerState {
// 	Running,
// 	Paused,
// }

// pub enum WorkerEvent {
// 	StateChange(WorkerState),
// 	CoreEvent(CoreEvent),
// }

/// An enum representing the various types of messages that a worker can send, excluding
/// internal commands.
pub enum WorkerSend {
	ManagerCommand(JobControllerCommand),
	Progress(JobProgress),
	Event(CoreEvent),
}

/// A trait for extending the `WorkerSend` enum with a method to convert it into a `WorkerSend`
pub trait WorkerSendExt {
	fn into_send(self) -> WorkerSend;
}

/// Commands that the worker can send/receive internally. Every command will kill
/// the Future that effectively runs the job. Currently, the only command is `Cancel`.
#[derive(Debug)]
pub enum WorkerCommand {
	Cancel(oneshot::Sender<()>),
}

/// The context that is passed to the worker when it is created. This context is used
/// throughout the lifetime of a worker and its job.
#[derive(Clone)]
pub struct WorkerCtx {
	/// The ID of the job that the worker is running
	pub job_id: String,
	/// A pointer to the prisma client
	pub db: Arc<PrismaClient>,
	/// A pointer to the stump configuration
	pub config: Arc<StumpConfig>,
	/// A sender for the core event channel
	pub core_event_tx: broadcast::Sender<CoreEvent>,
	/// A receiver for the worker commands
	pub commands_rx: async_channel::Receiver<WorkerCommand>,
	/// A sender for the worker to send commands to the job manager
	pub job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
}

impl WorkerCtx {
	/// Emit a [CoreEvent] to any clients listening to the server
	pub fn report_progress(&self, payload: JobProgress) {
		let send_result = self.core_event_tx.send(CoreEvent::JobUpdate(JobUpdate {
			id: self.job_id.clone(),
			payload,
		}));
		if let Err(send_error) = send_result {
			tracing::error!(?send_error, "Failed to send progress event");
		}
	}

	/// Send a command to the [super::JobManager]
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

	/// Send a batch of [WorkerSend] to the appropriate handlers
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
}

/// An instance of a running job, represented by a worker. The worker is responsible for
/// kicking off the job and managing its lifecycle.
pub struct Worker {
	// TODO: state? E.g. running, paused, etc.
	/// The sender through which the worker can send commands to itself. The corresponding
	/// receiver is stored in the worker context.
	commands_tx: async_channel::Sender<WorkerCommand>,
}

impl Worker {
	/// Create a new worker instance and its context
	async fn new(
		job_id: &str,
		db: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
		job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
	) -> Result<(Self, WorkerCtx), JobError> {
		let (commands_tx, commands_rx) = async_channel::unbounded::<WorkerCommand>();

		let worker_ctx = WorkerCtx {
			job_id: job_id.to_string(),
			db,
			config,
			core_event_tx,
			commands_rx,
			job_controller_tx,
		};

		Ok((Self { commands_tx }, worker_ctx))
	}

	/// Create a new [Worker] instance and immediately spawn it. This is the main entry point
	/// for creating a _running_ worker.
	///
	/// Note that workers are _only_ supported to be in a running state. A worker should
	/// not be created if it is not intended to be running.
	pub async fn create_and_spawn(
		job: Box<dyn Executor>,
		agent: Arc<JobManager>,
		db: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
		job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
	) -> Result<Arc<Self>, JobError> {
		let job_id = job.id().to_string();
		let (worker, worker_ctx) = Worker::new(
			job_id.as_str(),
			db,
			config,
			core_event_tx,
			job_controller_tx,
		)
		.await?;
		let worker = worker.arced();

		handle_job_start(&worker_ctx.db, job_id.clone()).await?;
		spawn(Self::work(worker_ctx, job, agent));

		Ok(worker)
	}

	/// A convenience method to wrap the worker in an Arc
	fn arced(self) -> Arc<Self> {
		Arc::new(self)
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
			)
		} else {
			tracing::error!("Failed to send cancel signal to worker");
		}
	}

	/// The main worker loop. This is where the job is run and the worker listens for
	/// commands to cancel the job.
	///
	/// Note more commands can be added in the future, e.g. pause/resume.
	async fn work(
		worker_ctx: WorkerCtx,
		mut job: Box<dyn Executor>,
		manager: Arc<JobManager>,
	) {
		let job_id = job.id().to_string();
		let finalizer_ctx = worker_ctx.clone();
		// let commands_rx = worker_ctx.commands_rx.clone();

		// let commands_rx_fut = commands_rx.recv();
		let job_handle = spawn(async move {
			let result = job.run(worker_ctx).await;
			(job, result)
		});

		// tokio::pin!(commands_rx_fut);
		tokio::pin!(job_handle);

		let start = Instant::now();
		loop {
			tokio::select! {
				job_result = &mut job_handle => {
					let elapsed = start.elapsed();
					match job_result {
						Ok((returned_job, result)) => {
							tracing::debug!(
								did_err = result.is_err(),
								?elapsed,
								"Task output received"
							);
							match result {
								Ok(output) => {
									tracing::info!("Job completed successfully!");
									finalizer_ctx.report_progress(JobProgress::finished());
									let _ = returned_job
											.persist_state(finalizer_ctx, output, elapsed)
											.await;

								},
								Err(error) => {
									tracing::error!(?error, "Job failed with critical error");
									finalizer_ctx.report_progress(JobProgress::status_msg(
										JobStatus::Failed,
										&format!("Job failed: {}", error),
									));

									let _ = returned_job
										.persist_failure(
											finalizer_ctx,
											JobStatus::Failed,
											elapsed,
										)
										.await;

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
									}
								},
							}
						},
						Err(join_error) => {
							tracing::error!(?join_error, ?elapsed, "Error while joining job worker thread");
							finalizer_ctx.report_progress(JobProgress::status_msg(
								JobStatus::Failed,
								&format!("Job failed: {}", join_error),
							));
							let _ = handle_do_cancel(job_id.clone(), &finalizer_ctx.db, elapsed).await;
						}
					}
					return manager.complete(job_id).await;
				},

				// TODO: Track the worker state and handle core events instead of commands,
				// Each task should listen for commands and handle them accordingly...
				// If a task would be started, it should understand the state and wait if paused

				// Ok(cmd) = &mut commands_rx_fut => {
				// 	tracing::debug!(?cmd, "Received command");
				// 	match cmd {
				// 		WorkerCommand::Cancel(return_sender) => {
				// 			let elapsed = start.elapsed();
				// 			job_handle.abort();
				// 			if job_handle.await.is_ok() {
				// 				tracing::warn!(
				// 					"Job worker thread ended successfully after a cancel?"
				// 				);
				// 			};
				// 			finalizer_ctx.report_progress(JobProgress::status_msg(
				// 				JobStatus::Cancelled,
				// 				"Job cancelled",
				// 			));
				// 			let _ = handle_do_cancel(job_id.clone(), &finalizer_ctx.db, elapsed).await;
				// 			return_sender.send(()).map_or_else(
				// 				|error| {
				// 					tracing::error!(
				// 						?error,
				// 						"Failed to send cancel confirmation"
				// 					);
				// 				},
				// 				|_| {
				// 					tracing::trace!("Cancel confirmation sent");
				// 				},
				// 			);
				// 			return manager.complete(job_id).await;
				// 		},
				// 	}
				// },
			}
		}
	}
}

/// Cancel a job by its ID
pub(crate) async fn handle_do_cancel(
	job_id: String,
	client: &PrismaClient,
	elapsed: Duration,
) -> Result<(), JobError> {
	let cancelled_job = client
		.job()
		.update(
			job::id::equals(job_id),
			vec![
				job::status::set(JobStatus::Cancelled.to_string()),
				job::ms_elapsed::set(
					elapsed.as_millis().try_into().unwrap_or_else(|e| {
						tracing::error!(error = ?e, "Wow! Overflowed i64 during attempt to convert job duration to milliseconds");
						i64::MAX
					}),
				),
			],
		)
		.exec()
		.await
		.map_or_else(
			|error| {
				tracing::error!(?error, "Failed to update job status to cancelled");
				None
			},
			Some,
		);

	tracing::trace!(?cancelled_job, "Job cancelled?");

	Ok(())
}

/// Update the job status to `Running` in the database
async fn handle_job_start(client: &PrismaClient, job_id: String) -> Result<(), JobError> {
	let started_job = client
		.job()
		.update(
			job::id::equals(job_id),
			vec![job::status::set(JobStatus::Running.to_string())],
		)
		.exec()
		.await?;

	tracing::trace!(?started_job, "Job started?");

	Ok(())
}
