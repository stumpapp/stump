use tokio::sync::oneshot;

use crate::job::JobError;

pub enum WorkerEvent {
	Progress, // TODO: data
	Complete,
}

/// Commands that the worker can send/receive internally. Currently only used for cancellation,
/// but could be used for other things in the future (e.g. pausing/resuming)
pub enum WorkerCommand {
	Cancel(oneshot::Sender<()>),
}

// TODO: prisma client
pub struct WorkerCtx {
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
	command_sender: async_channel::Sender<WorkerCommand>,
}

impl Worker {
	pub async fn new(
		event_sender: async_channel::Sender<WorkerEvent>,
	) -> Result<Self, JobError> {
		let (command_sender, command_receiver) =
			async_channel::unbounded::<WorkerCommand>();

		let worker_ctx = WorkerCtx {
			event_sender,
			command_receiver: command_receiver,
		};

		tokio::spawn(Self::run(worker_ctx));

		Ok(Self { command_sender })
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

	async fn run(worker_ctx: WorkerCtx) {
		// TODO: do stuff!
	}
}
