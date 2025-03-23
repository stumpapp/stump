use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tokio::sync::{
	broadcast,
	mpsc::{self, error::SendError},
	oneshot,
};

use super::{Executor, JobManager, JobManagerResult, WorkerSend, WorkerSendExt};
use crate::{config::StumpConfig, event::CoreEvent};

/// Input for commands that require an acknowledgement when they are completed
/// (e.g. cancel, pause, resume)
pub struct AcknowledgeableCommand {
	pub id: String,
	pub ack: oneshot::Sender<JobManagerResult<()>>,
}

/// Events that can be sent to the job controller. If any of these events require a response,
/// e.g. to provide an HTTP status code, a oneshot channel should be provided.
pub enum JobControllerCommand {
	/// Add a job to the queue to be run
	EnqueueJob(Box<dyn Executor>),
	/// A job has been completed and should be removed from the queue
	CompleteJob(String),
	/// Cancel a job by its ID
	CancelJob(AcknowledgeableCommand),
	/// Pause a job by its ID
	PauseJob(AcknowledgeableCommand),
	/// Resume a job by its ID
	ResumeJob(AcknowledgeableCommand),
	/// Shutdown the job controller. This will cancel all running jobs and clear the queue
	Shutdown(oneshot::Sender<()>),
}

impl WorkerSendExt for JobControllerCommand {
	fn into_worker_send(self) -> WorkerSend {
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
		conn: Arc<DatabaseConnection>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
	) -> Arc<Self> {
		let (commands_tx, commands_rx) = mpsc::unbounded_channel();
		let this = Arc::new(Self {
			commands_tx: commands_tx.clone(),
			manager: JobManager::new(conn, config, commands_tx, core_event_tx).arced(),
		});

		let this_cpy = this.clone();
		this_cpy.watch(commands_rx);

		this
	}

	pub async fn initialize(&self) -> JobManagerResult<()> {
		self.manager.clone().initialize().await
	}

	/// Starts the watcher loop for the [`JobController`]. This function will listen for incoming
	/// commands and execute them.
	pub fn watch(
		self: Arc<Self>,
		mut commands_rx: mpsc::UnboundedReceiver<JobControllerCommand>,
	) {
		tokio::spawn(async move {
			while let Some(event) = commands_rx.recv().await {
				match event {
					JobControllerCommand::EnqueueJob(job) => {
						let name = job.name();
						tracing::trace!(name, job_id = ?job.id(), "Received enqueue job event");
						self.manager.clone().enqueue(job).await.map_or_else(
							|error| tracing::error!(?error, "Failed to enqueue job!"),
							|_| tracing::info!(name, "Successfully enqueued job"),
						);
					},
					JobControllerCommand::CompleteJob(id) => {
						self.manager.clone().complete(id).await;
					},
					JobControllerCommand::CancelJob(cmd) => {
						let result = self.manager.clone().cancel(cmd.id).await;
						acknowledge_command_trace(
							cmd.ack,
							result,
							"Cancel confirmation sent",
							"Error while sending cancel confirmation",
						);
					},
					JobControllerCommand::PauseJob(cmd) => {
						self.manager.clone().pause(cmd.id).await.map_or_else(
							|error| tracing::error!(?error, "Failed to pause job!"),
							|_| {
								acknowledge_command_info(
									cmd.ack,
									Ok(()),
									"Successfully issued pause request",
									"Error while sending pause confirmation",
								);
							},
						);
					},
					JobControllerCommand::ResumeJob(cmd) => {
						self.manager.clone().resume(cmd.id).await.map_or_else(
							|error| tracing::error!(?error, "Failed to resume job!"),
							|_| {
								acknowledge_command_info(
									cmd.ack,
									Ok(()),
									"Successfully issued resume request",
									"Error while sending resume confirmation",
								);
							},
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
						);
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

/// A helper function to send a [`JobManagerResult`] back along a job's [`oneshot::Sender`]
/// and log a [`tracing::trace!`] `msg`. If sending fails then `err_msg`is logged as an
/// error instead.
fn acknowledge_command_trace(
	ack: oneshot::Sender<JobManagerResult<()>>,
	res: JobManagerResult<()>,
	msg: &str,
	err_msg: &str,
) {
	ack.send(res).map_or_else(
		|error| {
			tracing::error!(?error, err_msg);
		},
		|_| tracing::trace!(msg),
	);
}

/// A helper function to send a [`JobManagerResult`] back along a job's [`oneshot::Sender`]
/// and log a [`tracing::info!`] `msg`. If sending fails then `err_msg`is logged as an
/// error instead.
fn acknowledge_command_info(
	ack: oneshot::Sender<JobManagerResult<()>>,
	res: JobManagerResult<()>,
	msg: &str,
	err_msg: &str,
) {
	ack.send(res).map_or_else(
		|error| {
			tracing::error!(?error, err_msg);
		},
		|_| tracing::info!(msg),
	);
}
