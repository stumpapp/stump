use std::sync::Arc;

use tokio::{spawn, sync::oneshot};

use crate::{job::JobError, prisma::PrismaClient};

use super::JobExecutor;

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
	pub db: Arc<PrismaClient>,
	pub job_id: String,
	event_sender: async_channel::Sender<WorkerEvent>,
	command_receiver: async_channel::Receiver<WorkerCommand>,
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
	job: Box<dyn JobExecutor>,
	command_sender: async_channel::Sender<WorkerCommand>,
}

impl Worker {
	pub async fn new(
		job: Box<dyn JobExecutor>,
		db: Arc<PrismaClient>,
		event_sender: async_channel::Sender<WorkerEvent>,
	) -> Result<(Self, WorkerCtx), JobError> {
		let (command_sender, command_receiver) =
			async_channel::unbounded::<WorkerCommand>();

		let worker_ctx = WorkerCtx {
			job_id: job.id().to_string(),
			db,
			event_sender,
			command_receiver: command_receiver,
		};

		Ok((
			Self {
				job,
				command_sender,
			},
			worker_ctx,
		))
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

	async fn work(worker_ctx: WorkerCtx) {
		let commands_rx = worker_ctx.command_receiver.clone();
		let shutdown_fut = commands_rx.recv();
		tokio::pin!(shutdown_fut);

		// let mut run_task = {
		// 	let ctx = worker_ctx.clone();
		// 	spawn(async move {
		// 		let job_result = job.run(ctx).await;

		// 		(job, job_result)
		// 	})
		// };

		// TODO: commands (if ever extended to more than cancel) should be handled in a loop
		tokio::select! {
			command = shutdown_fut => {
				// TODO: do something
				println!("Received command: {:?}", command);
			},
			_ = tokio::time::sleep(std::time::Duration::from_secs(20)) => {
				println!("Timeout reached!");
			},
		}
	}
}
