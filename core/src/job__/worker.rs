use std::sync::Arc;

use tokio::sync::{mpsc, oneshot};
use uuid::Uuid;

use super::StatefulJob;
use crate::{config::StumpConfig, prisma::PrismaClient};

#[derive(Debug)]
enum WorkerCommand {
	StartJob(Box<dyn StatefulJob>),
	CancelJob,
	PauseJob,
	Shutdown,
}

#[derive(Debug)]
enum WorkerUpdate {
	/// Sent when a job has started, includes the [Uuid] for the job.
	JobStarted(Uuid),
	/// Sent when a job has executed its `do_work` function, includes the progress
	/// as an [f64] between 0 and 1.
	JobProgress(f64),
	/// Sent wehn a job has been completed.
	JobCompleted,
	/// Sent if a job is unable to start. Includes the job which was expected to start
	/// so that it can be requeued.
	JobStartError(Box<dyn StatefulJob>),
	/// Sent when the worker has shut down.
	Shutdown,
}

#[derive(Debug)]
enum WorkerState {
	Idle,
	Loaded,
	Working(f64),
	Stopped,
}

/// An entity for managing messages to and from worker threads.
#[derive(Debug)]
pub struct WorkerManager {
	/// Indicates the state of the associated worker thread.
	state: WorkerState,
	/// Indicates the job [Uuid] pf the worker if it has a job.
	job_id: Option<Uuid>,

	/// The channel by which commands are sent to the worker thread
	worker_tx: mpsc::UnboundedSender<WorkerCommand>,
	/// The channel by which updates are recieved from the worker thread
	worker_rx: mpsc::UnboundedReceiver<WorkerUpdate>,
}

impl WorkerManager {
	/// Creates a new [WorkerManager] and starts a thread for performing work.
	pub fn create(db: Arc<PrismaClient>, config: Arc<StumpConfig>) -> Self {
		// Start worker thread.
		let (worker_tx, worker_rx) =
			WorkerAgent::start_thread(WorkerContext { db, config });

		// Return Self to manage the thread.
		Self {
			state: WorkerState::Idle,
			job_id: None,

			worker_tx,
			worker_rx,
		}
	}

	/// Catch up on updates from the worker and update internal state to match.
	pub fn do_update(&mut self) {
		while let Ok(update) = self.worker_rx.try_recv() {
			match update {
				WorkerUpdate::JobStarted(id) => {
					self.job_id = Some(id);
					self.state = WorkerState::Working(0.0);
				},
				WorkerUpdate::JobProgress(prog) => {
					self.state = WorkerState::Working(prog)
				},
				WorkerUpdate::JobCompleted => {
					self.job_id = None;
					self.state = WorkerState::Idle;
				},
				WorkerUpdate::JobStartError(_) => panic!("Uhoh JobStartError"),
				WorkerUpdate::Shutdown => todo!(),
			}
		}
	}

	/// Returns `true` if the associated worker thread is ready for a new job.
	pub fn is_idle(&self) -> bool {
		match self.state {
			WorkerState::Idle => true,
			_ => false,
		}
	}

	pub fn start_job(&mut self, job: Box<dyn StatefulJob>) {
		// TODO handle errors
		self.worker_tx.send(WorkerCommand::StartJob(job)).unwrap();
		self.state = WorkerState::Loaded;
	}
}

/// Context data supplied to a [WorkerAgent]
#[derive(Debug)]
pub struct WorkerContext {
	/// A pointer to the prisma database client.
	pub db: Arc<PrismaClient>,
	/// A pointer to the server's startup configuration.
	pub config: Arc<StumpConfig>,
}

/// Oversees the worker thread, recieving commands and starting and stopping
/// job progress accordingly.
///
/// Worker threads are created by calling `start_thread`. Once the thread has started,
/// all interaction with the thread is performed through the channels returned by
/// `start_thread`. This is typically not done manually, and is instead performed by
/// the paired [WorkerManager] when calling `create`.
///
/// A [WorkerCommand::Shutdown] command should be sent to the worker to manually
/// trigger shutdown before dropping the paired [WorkerManager].
#[derive(Debug)]
struct WorkerAgent {
	/// Contains references to the database client and server configuration.
	worker_ctx: WorkerContext,

	/// Recieves commands from the paired [WorkerManager].
	manager_rx: mpsc::UnboundedReceiver<WorkerCommand>,
	/// Sends commands to the paired [WorkerManager].
	manager_tx: mpsc::UnboundedSender<WorkerUpdate>,

	/// Tracks if the main loop has been started.
	is_running: bool,
	/// The job currently being run, should be [None] if the worker is idle.
	current_job: Option<Box<dyn StatefulJob>>,
}

impl WorkerAgent {
	/// Creates a [WorkerAgent] running in a new thread.
	pub fn start_thread(
		worker_ctx: WorkerContext,
	) -> (
		mpsc::UnboundedSender<WorkerCommand>,
		mpsc::UnboundedReceiver<WorkerUpdate>,
	) {
		let (from_manager_tx, from_manager_rx) = mpsc::unbounded_channel();
		let (to_manager_tx, to_manager_rx) = mpsc::unbounded_channel();

		let controller = Self {
			worker_ctx,

			manager_rx: from_manager_rx,
			manager_tx: to_manager_tx,

			is_running: false,
			current_job: None,
		};

		// tokio::spawn(async move { controller.main_loop() });

		(from_manager_tx, to_manager_rx)
	}

	/// The main thread loop which runs until a shutdown signal is recieved
	async fn main_loop(mut self) {
		// Guard to prevent initiating the main loop twice
		if self.is_running {
			tracing::error!("Attempted to start job controller thread twice");
			return;
		}
		self.is_running = true;

		'main: loop {
			// Recieve commands from manager.
			while let Ok(cmd) = self.manager_rx.try_recv() {
				match cmd {
					WorkerCommand::StartJob(job) => self.start_job(job),
					WorkerCommand::CancelJob => todo!(),
					WorkerCommand::PauseJob => todo!(),
					WorkerCommand::Shutdown => {
						self.do_shutdown().await;
						break 'main;
					},
				}
			}

			// Handle disconnected reciever
			if let Err(mpsc::error::TryRecvError::Disconnected) =
				self.manager_rx.try_recv()
			{
				tracing::error!(
					"Worker controller reciever disconnected before shutdown"
				);
				self.do_shutdown().await;
				break 'main;
			}

			// Handle the job (if there is one)
			if let Some(job) = &mut self.current_job {
				// If the job isn't finished yet, work on it
				if !job.is_finished() {
					job.do_work(&self.worker_ctx).await;
				}
				// If it has finished, send an update indicating this
				// TODO: Verify that this is going to work
				else {
					self.send_update(WorkerUpdate::JobCompleted);
				}
			}
			// If there isn't a job, then park the thread and wait for a job.
			else {
				todo!()
			}
		}

		// Send shutdown message as we exit the loop
		self.send_update(WorkerUpdate::Shutdown);
	}

	/// Called when a [WorkerCommand::StartJob] is recieved. Causes the command to be
	/// stored in the [WorkerAgent], generates a [Uuid] for the job, and transmits a
	/// [WorkerUpdate::JobStarted] message containing the id.
	///
	/// If called when a job is already running, the job is sent back to the sender
	/// with a [WorkerUpdate::JobStartError] message.
	fn start_job(&mut self, job: Box<dyn StatefulJob>) {
		// Handle case where a job is already running by sending the job back
		if self.current_job.is_some() {
			tracing::error!("Attempted to start a job while one was already running");
			self.send_update(WorkerUpdate::JobStartError(job))
		}
		// Otherwise start up the job and send an update
		else {
			let job_id = Uuid::new_v4();
			self.current_job = Some(job);
			self.send_update(WorkerUpdate::JobStarted(job_id))
		}
	}

	/// Shut the worker thread down by saving the state of the current job, if any.
	async fn do_shutdown(&mut self) {
		// If any jobs are running we need to save their state before exiting
		if let Some(job) = &self.current_job {
			job.save_state(&self.worker_ctx).await;
		}
	}

	/// A helper function for transmitting updates to the [WorkerManager].
	fn send_update(&mut self, update: WorkerUpdate) {
		if let Err(e) = self.manager_tx.send(update) {
			tracing::error!("Error sending WorkerUpdate: {}", e);
		}
	}
}
