use std::{
	sync::Arc,
	time::{Duration, Instant},
};

use futures::{stream, StreamExt};
use futures_concurrency::stream::Merge;
use std::pin::pin;
use tokio::{
	sync::{broadcast, oneshot},
	task::{spawn, JoinError},
};

use crate::{
	config::StumpConfig,
	event::CoreEvent,
	job::{ExecutorOutput, JobError, JobStatus},
	prisma::{job, PrismaClient},
};

use super::{Executor, JobManagerAgent, JobProgress, JobUpdate};

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
	pub job_id: String,
	pub db: Arc<PrismaClient>,
	pub config: Arc<StumpConfig>,
	pub event_sender: broadcast::Sender<CoreEvent>,
	pub command_receiver: async_channel::Receiver<WorkerCommand>,
}

impl WorkerCtx {
	/// Emit a progress event to any clients listening to the server
	pub fn progress(&self, payload: JobProgress) {
		let send_result = self.event_sender.send(CoreEvent::JobUpdate(JobUpdate {
			id: self.job_id.clone(),
			payload,
		}));
		if let Err(send_error) = send_result {
			tracing::error!(?send_error, "Failed to send progress event");
		}
	}
}

pub struct Worker {
	// TODO: state? E.g. running, paused, etc.
	/// The sender through which the worker can send commands to itself. The corresponding
	/// receiver is stored in the worker context.
	command_sender: async_channel::Sender<WorkerCommand>,
}

impl Worker {
	/// Create a new worker instance and its context
	async fn new(
		job_id: &str,
		db: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		event_sender: broadcast::Sender<CoreEvent>,
	) -> Result<(Self, WorkerCtx), JobError> {
		let (command_sender, command_receiver) =
			async_channel::unbounded::<WorkerCommand>();

		let worker_ctx = WorkerCtx {
			job_id: job_id.to_string(),
			db,
			config,
			event_sender,
			command_receiver: command_receiver,
		};

		Ok((Self { command_sender }, worker_ctx))
	}

	/// Create a new [Worker] instance and immediately spawn it. This is the main entry point
	/// for creating a _running_ worker.
	///
	/// Note that workers are _only_ supported to be in a running state. A worker should
	/// not be created if it is not intended to be running.
	pub async fn create_and_spawn(
		job: Box<dyn Executor>,
		agent: Arc<JobManagerAgent>,
		db: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		event_sender: broadcast::Sender<CoreEvent>,
	) -> Result<Arc<Self>, JobError> {
		let job_id = job.id().to_string();
		let (worker, worker_ctx) =
			Worker::new(job_id.as_str(), db, config, event_sender).await?;
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
			.command_sender
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
		agent: Arc<JobManagerAgent>,
	) {
		let job_id = job.id().to_string();
		let finalizer_ctx = worker_ctx.clone();
		let commands_rx = worker_ctx.command_receiver.clone();

		enum StreamEvent {
			NewCommand(WorkerCommand),
			JobCompleted(
				Result<(Box<dyn Executor>, Result<ExecutorOutput, JobError>), JoinError>,
			),
		}

		let start = Instant::now();
		let mut job_handle = spawn(async move {
			let result = job.run(worker_ctx).await;
			(job, result)
		});
		let job_stream = stream::once(&mut job_handle).map(StreamEvent::JobCompleted);
		let command_stream = commands_rx.clone().map(StreamEvent::NewCommand);

		let mut stream = pin!((job_stream, command_stream).merge());

		while let Some(event) = stream.next().await {
			match event {
				StreamEvent::JobCompleted(Err(error)) => {
					tracing::error!(?error, "Error while joining job worker thread");
					// TODO: handle error better
					return;
				},
				StreamEvent::JobCompleted(Ok((returned_job, result))) => {
					let elapsed = start.elapsed();
					match result {
						Ok(output) => {
							tracing::info!(?output, "Job completed successfully!");
							let _ = returned_job
								.persist_state(finalizer_ctx, output, elapsed)
								.await;
						},
						Err(error) => {
							tracing::error!(?error, "Job failed with critical error");
							let _ = returned_job
								.persist_failure(
									finalizer_ctx,
									JobStatus::Failed,
									elapsed,
								)
								.await;
						},
					}
					return agent.complete(job_id).await;
				},
				StreamEvent::NewCommand(cmd) => match cmd {
					WorkerCommand::Cancel(return_sender) => {
						let elapsed = start.elapsed();
						let client = finalizer_ctx.db;
						job_handle.abort();
						if job_handle.await.is_ok() {
							tracing::warn!(
								"Job worker thread ended successfully after a cancel?"
							);
						};
						let _ = handle_do_cancel(job_id.clone(), &client, elapsed).await;
						return_sender.send(()).map_or_else(
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
						return agent.complete(job_id).await;
					},
				},
			}
		}

		tracing::warn!("Job worker stream ended unexpectedly");
		agent.complete(job_id).await;
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
			|job| Some(job),
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
