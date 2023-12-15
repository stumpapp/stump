use std::sync::Arc;

use tokio::sync::{mpsc, oneshot};

use super::StatefulJob;
use crate::{config::StumpConfig, prisma, Ctx};

enum WorkerCommand {
	StartJob(Box<dyn StatefulJob>),
	CancelJob(String),
	PauseJob(String),
	Shutdown,
}

enum WorkerUpdate {
	JobStarted(String),
	JobProgress(f64),
	JobCompleted(String),
}

enum WorkerState {
	Idle,
	Loaded,
	Working(f64),
	Stopped,
}

/// An entity for managing messages from and to worker threads.
pub struct WorkerManager {
	/// Indicates the state of the associated worker thread.
	state: WorkerState,

	/// The channel by which commands are sent to the worker thread
	worker_tx: mpsc::UnboundedSender<WorkerCommand>,
	/// The channel by which updates are recieved from the worker thread
	worker_rx: mpsc::UnboundedReceiver<WorkerUpdate>,
}

impl WorkerManager {
	/// Creates a new [WorkerManager] and starts a thread for performing work.
	pub fn create(ctx: &Arc<Ctx>) -> Self {
		// Start worker thread with a worker context based on `ctx`.
		let (worker_tx, worker_rx) =
			WorkerThreadController::start_thread(WorkerContext {
				db: ctx.db.clone(),
				config: ctx.config.clone(),
			});

		// Return Self to manage the thread.
		Self {
			state: WorkerState::Idle,
			worker_tx,
			worker_rx,
		}
	}

	/// Catch up on updates from the worker and update internal state to match.
	pub fn do_update(&mut self) {
		while let Ok(update) = self.worker_rx.try_recv() {
			match update {
				WorkerUpdate::JobStarted(_) => self.state = WorkerState::Working(0.0),
				WorkerUpdate::JobProgress(prog) => {
					self.state = WorkerState::Working(prog)
				},
				WorkerUpdate::JobCompleted(_) => self.state = WorkerState::Idle,
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

struct WorkerContext {
	pub db: Arc<prisma::PrismaClient>,
	pub config: Arc<StumpConfig>,
}

struct WorkerThreadController {
	worker_ctx: WorkerContext,

	manager_rx: mpsc::UnboundedReceiver<WorkerCommand>,
	manager_tx: mpsc::UnboundedSender<WorkerUpdate>,

	/// Tracks if the main loop has been started
	is_running: bool,
}

impl WorkerThreadController {
	/// Creates a [WorkerThreadController] running in a new thread.
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
		};

		tokio::spawn(async move { controller.main_loop() });

		(from_manager_tx, to_manager_rx)
	}

	/// The main thread loop which runs until a shutdown signal is recieved
	fn main_loop(mut self) {
		// Guard to prevent running the loop twice
		if self.is_running {
			tracing::error!("Attempted to start job controller thread twice");
			return;
		}
		self.is_running = true;

		'main: loop {
			while let Ok(cmd) = self.manager_rx.try_recv() {
				match cmd {
					WorkerCommand::StartJob(_) => todo!(),
					WorkerCommand::CancelJob(_) => todo!(),
					WorkerCommand::PauseJob(_) => todo!(),
					WorkerCommand::Shutdown => {
						self.do_shutdown();
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
				self.do_shutdown();
				break 'main;
			}
		}
	}

	fn do_shutdown(&mut self) {
		todo!()
	}
}
