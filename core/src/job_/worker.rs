use std::sync::Arc;

use tokio::{spawn, sync::oneshot};

use crate::{config::StumpConfig, job::JobError, prisma::PrismaClient};

use super::{JobExecutor, JobManagerAgent};

pub enum WorkerEvent {
	Progress, // TODO: data
	Complete,
}

/// Commands that the worker can send/receive internally. Every command will kill
/// the Future that effectively runs the job. Currently, the only command is `Cancel`.
#[derive(Debug)]
pub enum WorkerCommand {
	Cancel(oneshot::Sender<()>),
}

#[derive(Clone)]
pub struct WorkerCtx {
	pub job_id: String,
	pub db: Arc<PrismaClient>,
	pub config: Arc<StumpConfig>,
	pub event_sender: async_channel::Sender<WorkerEvent>,
	pub command_receiver: async_channel::Receiver<WorkerCommand>,
}

impl WorkerCtx {
	// TODO: update params
	pub fn progress(&self) {
		if self.event_sender.is_closed() {
			tracing::error!("Worker event sender is closed! Cannot send progress event");
		} else {
			self.event_sender
				.try_send(WorkerEvent::Progress)
				.unwrap_or_else(|error| {
					tracing::error!(?error, "Failed to send progress event");
				});
		}
	}
}

pub struct Worker {
	// TODO: state? E.g. running, paused, etc.
	command_sender: async_channel::Sender<WorkerCommand>,
}

impl Worker {
	/// Create a new worker instance and its context
	async fn new(
		job_id: &str,
		db: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		event_sender: async_channel::Sender<WorkerEvent>,
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

	pub async fn create_and_spawn(
		job: Box<dyn JobExecutor>,
		agent: Arc<JobManagerAgent>,
		db: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		event_sender: async_channel::Sender<WorkerEvent>,
	) -> Result<Arc<Self>, JobError> {
		let job_id = job.id().to_string();
		let (worker, worker_ctx) =
			Worker::new(job_id.as_str(), db, config, event_sender).await?;
		let worker = worker.arced();

		spawn(Self::work(worker_ctx, job, agent));

		Ok(worker)
	}

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

	async fn work(
		worker_ctx: WorkerCtx,
		mut job: Box<dyn JobExecutor>,
		agent: Arc<JobManagerAgent>,
	) {
		let (commands_tx, commands_rx) = async_channel::unbounded::<WorkerCommand>();

		let job_id = job.id().to_string();
		let mut handle = spawn(async move {
			let result = job.run(worker_ctx, commands_rx).await;
			(job, result)
		});

		// TODO: stream events and handle them

		agent.complete(job_id).await;
	}
}
