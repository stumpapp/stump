use std::{collections::VecDeque, sync::Arc};

use tokio::sync::{mpsc, oneshot};

use super::{error::JobManagerError, worker::WorkerManager, StatefulJob};
use crate::{config::StumpConfig, prisma::PrismaClient};

/// Commands that can be sent via a [JobManager]. If any of these commands require a
/// response (e.g., to provide an HTTP status code) a oneshot channel should be provided.
#[derive(Debug)]
pub enum JobManagerCommand {
	/// Add a job to the queue to be run.
	EnqueueJob(Box<dyn StatefulJob>),
	/// Cancel a job by its ID.
	CancelJob(String, oneshot::Sender<JobManagerResult<()>>),
	/// Shutdown the job manager. This will cancel all running jobs and clear the queue.
	Shutdown(oneshot::Sender<()>),
}

type JobManagerResult<T> = Result<T, JobManagerError>;

/// A struct that manages the execution and queueing of jobs and their workers.
#[derive(Debug)]
pub struct JobManager {
	/// A transmitter to communicate with the [JobManagerAgent].
	controller_tx: mpsc::UnboundedSender<JobManagerCommand>,
}

impl JobManager {
	/// Create a [JobManager] and launch a handler thread to be managed by it.
	pub fn create(db: Arc<PrismaClient>, config: Arc<StumpConfig>) -> Self {
		// Launch controller thread
		let controller_tx = JobManagerAgent::start_thread(db, config);

		Self { controller_tx }
	}

	/// Add a job to the end of the queue.
	pub fn enqueue_job(&mut self, job: Box<dyn StatefulJob>) -> JobManagerResult<()> {
		self.send_command(JobManagerCommand::EnqueueJob(job))
	}

	/// Cancel a job by its id.
	pub fn cancel_job(&mut self, job_id: String) -> JobManagerResult<()> {
		todo!();
	}

	/// Signal to the [JobManagerAgent] to shut down.
	pub fn shutdown(&mut self, tx: oneshot::Sender<()>) {
		todo!();
	}

	/// A helper function for transmitting commands to the [JobManagerAgent]
	fn send_command(&mut self, cmd: JobManagerCommand) -> JobManagerResult<()> {
		match self.controller_tx.send(cmd) {
			Ok(_) => Ok(()),
			Err(e) => Err(JobManagerError::CommandSendError(e)),
		}
	}
}

/// A controller for the thread managing worker state. It is responsible for recieving  signals
/// from the [JobManager], queueing jobs, and recieving updates from workers.
#[derive(Debug)]
struct JobManagerAgent {
	/// A pointer to the prisma database client.
	db: Arc<PrismaClient>,
	/// A pointer to the Stump server configuration set at startup.
	config: Arc<StumpConfig>,
	/// Jobs waiting to be assigned a worker thread
	jobs: VecDeque<Box<dyn StatefulJob>>,
	/// Each worker managed by the controller has a corresponding [WorkerManger] for signaling.
	workers: Vec<WorkerManager>,

	/// Recieves messages from the [JobManager] controlling this thread.
	base_rx: mpsc::UnboundedReceiver<JobManagerCommand>,

	/// Tracks if the main loop has been started
	is_running: bool,
}

impl JobManagerAgent {
	/// Create a new [JobManagerAgent] with available workers as defined by the
	/// [StumpConfig] provided.
	pub fn start_thread(
		db: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
	) -> mpsc::UnboundedSender<JobManagerCommand> {
		let (base_tx, base_rx) = mpsc::unbounded_channel();

		let controller = Self {
			db,
			config: config.clone(),
			jobs: VecDeque::new(),
			workers: Vec::with_capacity(config.worker_count),

			base_rx,

			is_running: false,
		};

		tokio::spawn(async move { controller.main_loop() });

		base_tx
	}

	/// Manages workers until a shutdown message is recieved.
	async fn main_loop(mut self) {
		// Guard to prevent running the loop twice
		if self.is_running {
			tracing::error!("Attempted to start job controller thread twice");
			return;
		}
		self.is_running = true;

		// Spawn workers
		for _ in 0..self.config.worker_count {
			self.workers
				.push(WorkerManager::create(self.db.clone(), self.config.clone()))
		}

		// This loop ends when shutdown occurs
		'main: loop {
			// Recive any available messages from the base
			while let Ok(cmd) = self.base_rx.try_recv() {
				match cmd {
					JobManagerCommand::EnqueueJob(job) => self.jobs.push_back(job),
					JobManagerCommand::CancelJob(_, _) => todo!(),
					JobManagerCommand::Shutdown(_) => {
						self.do_shutdown();
						break 'main;
					},
				}
			}

			// Handle disconnected reciever
			if let Err(mpsc::error::TryRecvError::Disconnected) = self.base_rx.try_recv()
			{
				tracing::error!(
					"Jobs thread controller reciever disconnected before shutdown"
				);
				self.do_shutdown();
				break 'main;
			}

			// Update workers
			self.workers.iter_mut().for_each(|w| w.do_update());
			self.delegate_work();
		}
	}

	/// Instructs idle workers to do work
	fn delegate_work(&mut self) {
		while let Some(job) = self.jobs.pop_front() {
			// Find an idle worker
			if let Some(worker) = self.workers.iter_mut().find(|w| w.is_idle()) {
				worker.start_job(job);
			}
			// If no worker is idle, put the job back
			else {
				self.jobs.push_front(job);
			}
		}
	}

	/// Shuts down the controller and all associated workers, saving job state in the process.
	fn do_shutdown(&self) {
		todo!()
	}
}
