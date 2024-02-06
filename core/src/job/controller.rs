use std::sync::Arc;

use tokio::sync::{
	broadcast,
	mpsc::{self, error::SendError},
	oneshot,
};

use super::{Executor, JobManager, JobManagerResult, WorkerSend, WorkerSendExt};
use crate::{config::StumpConfig, event::CoreEvent, prisma::PrismaClient};

/// Events that can be sent to the job controller. If any of these events require a response,
/// e.g. to provide an HTTP status code, a oneshot channel should be provided.
pub enum JobControllerCommand {
	/// Add a job to the queue to be run
	EnqueueJob(Box<dyn Executor>),
	/// A job has been completed and should be removed from the queue
	CompleteJob(String),
	/// Cancel a job by its ID
	CancelJob(String, oneshot::Sender<JobManagerResult<()>>),
	/// Shutdown the job controller. This will cancel all running jobs and clear the queue
	Shutdown(oneshot::Sender<()>),
}

impl WorkerSendExt for JobControllerCommand {
	fn into_send(self) -> WorkerSend {
		WorkerSend::ManagerCommand(self)
	}
}

/// A struct that controls the job manager and its workers. This struct is responsible for
/// managing incoming commands and sending them to the job manager.
pub struct JobController {
	manager: Arc<JobManager>,
	/// A channel to send job manager events
	commands_tx: mpsc::UnboundedSender<JobControllerCommand>,
}

impl JobController {
	/// Creates a new job controller instance and starts the watcher loop in a new thread
	pub fn new(
		client: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
	) -> Arc<Self> {
		let (commands_tx, commands_rx) = mpsc::unbounded_channel();
		let this = Arc::new(Self {
			commands_tx: commands_tx.clone(),
			manager: JobManager::new(client, config, commands_tx, core_event_tx).arced(),
		});

		let this_cpy = this.clone();
		this_cpy.watch(commands_rx);

		this
	}

	/// Starts the watcher loop for the job manager
	pub fn watch(
		self: Arc<Self>,
		mut commands_rx: mpsc::UnboundedReceiver<JobControllerCommand>,
	) {
		tokio::spawn(async move {
			while let Some(event) = commands_rx.recv().await {
				match event {
					JobControllerCommand::EnqueueJob(job) => {
						tracing::trace!("Received enqueue job event");
						self.manager.clone().enqueue(job).await.map_or_else(
							|error| tracing::error!(?error, "Failed to enqueue job!"),
							|_| tracing::info!("Successfully enqueued job"),
						);
					},
					JobControllerCommand::CompleteJob(job_id) => {
						self.manager.clone().complete(job_id).await;
					},
					JobControllerCommand::CancelJob(job_id, tx) => {
						let result = self.manager.clone().cancel(job_id).await;
						tx.send(result).map_or_else(
							|error| {
								tracing::error!(
									?error,
									"Error while sending cancel confirmation"
								);
							},
							|_| tracing::trace!("Cancel confirmation sent"),
						);
					},
					JobControllerCommand::Shutdown(return_sender) => {
						self.manager.clone().shutdown().await;
						return_sender.send(()).map_or_else(
							|error| {
								tracing::error!(
									?error,
									"Error while sending shutdown confirmation"
								);
							},
							|_| tracing::trace!("Shutdown confirmation sent"),
						)
					},
				}
			}
		});
	}

	/// Pushes a command to the main watcher loop
	pub fn push_command(
		&self,
		event: JobControllerCommand,
	) -> Result<(), SendError<JobControllerCommand>> {
		self.commands_tx.send(event)
	}
}
