use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
	time::Duration,
};

use futures::future::join_all;
use tokio::sync::{
	broadcast,
	mpsc::{self, error::SendError},
	oneshot, RwLock,
};

use super::{
	error::JobManagerError, handle_do_cancel, Executor, Worker, WorkerSend, WorkerSendExt,
};
use crate::{
	config::StumpConfig,
	event::CoreEvent,
	job::JobStatus,
	prisma::{job, PrismaClient},
};

/// Events that can be sent to the job manager. If any of these events require a response,
/// e.g. to provide an HTTP status code, a oneshot channel should be provided.
pub enum JobManagerCommand {
	/// Add a job to the queue to be run
	EnqueueJob(Box<dyn Executor>),
	/// A job has been completed and should be removed from the queue
	CompleteJob(String),
	/// Cancel a job by its ID
	CancelJob(String, oneshot::Sender<JobManagerResult<()>>),
	/// Shutdown the job manager. This will cancel all running jobs and clear the queue
	Shutdown(oneshot::Sender<()>),
}

impl WorkerSendExt for JobManagerCommand {
	fn into_send(self) -> WorkerSend {
		WorkerSend::ManagerCommand(self)
	}
}

type JobManagerResult<T> = Result<T, JobManagerError>;

/// A struct that manages the execution and queueing of jobs and their workers
pub struct JobManager {
	agent: Arc<JobManagerAgent>,
	/// A channel to send job manager events
	commands_tx: mpsc::UnboundedSender<JobManagerCommand>,
}

impl JobManager {
	/// Creates a new job manager instance and starts the watcher loop in a new thread
	pub fn new(
		client: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		core_event_tx: broadcast::Sender<CoreEvent>,
	) -> Arc<Self> {
		let (commands_tx, commands_rx) = mpsc::unbounded_channel();
		let this = Arc::new(Self {
			commands_tx: commands_tx.clone(),
			agent: JobManagerAgent::new(client, config, commands_tx, core_event_tx)
				.arced(),
		});

		let this_cpy = this.clone();
		this_cpy.start(commands_rx);

		this
	}

	/// Starts the watcher loop for the job manager
	pub fn start(
		self: Arc<Self>,
		mut commands_rx: mpsc::UnboundedReceiver<JobManagerCommand>,
	) {
		tokio::spawn(async move {
			while let Some(event) = commands_rx.recv().await {
				match event {
					JobManagerCommand::EnqueueJob(job) => {
						tracing::trace!("Received enqueue job event");
						self.agent.clone().enqueue(job).await.map_or_else(
							|error| tracing::error!(?error, "Failed to enqueue job!"),
							|_| tracing::info!("Successfully enqueued job"),
						);
					},
					JobManagerCommand::CompleteJob(job_id) => {
						self.agent.clone().complete(job_id).await;
					},
					JobManagerCommand::CancelJob(job_id, tx) => {
						let result = self.agent.clone().cancel(job_id).await;
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
					JobManagerCommand::Shutdown(return_sender) => {
						self.agent.clone().shutdown().await;
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

	pub fn push_event(
		&self,
		event: JobManagerCommand,
	) -> Result<(), SendError<JobManagerCommand>> {
		self.commands_tx.send(event)
	}
}

/// A helper struct that holds the job queue and a list of workers for the job manager
pub struct JobManagerAgent {
	/// Queue of jobs waiting to be run in a worker thread
	queue: RwLock<VecDeque<Box<dyn Executor>>>,
	/// Worker threads with a running job
	workers: RwLock<HashMap<String, Arc<Worker>>>,
	/// A channel to send shutdown signals to the parent job manager
	job_manager_tx: mpsc::UnboundedSender<JobManagerCommand>,
	/// A channel to emit core events
	core_event_tx: broadcast::Sender<CoreEvent>,
	/// A pointer to the PrismaClient
	client: Arc<PrismaClient>,
	/// A pointer to the core config
	config: Arc<StumpConfig>,
}

impl JobManagerAgent {
	/// Creates a new Jobs instance
	pub fn new(
		client: Arc<PrismaClient>,
		config: Arc<StumpConfig>,
		job_manager_tx: mpsc::UnboundedSender<JobManagerCommand>,
		core_event_tx: broadcast::Sender<CoreEvent>,
	) -> Self {
		Self {
			queue: RwLock::new(VecDeque::new()),
			workers: RwLock::new(HashMap::new()),
			job_manager_tx,
			core_event_tx,
			client,
			config,
		}
	}

	/// Take ownership of self and return it wrapped in an Arc
	pub fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	fn get_event_tx(&self) -> broadcast::Sender<CoreEvent> {
		self.core_event_tx.clone()
	}

	/// Add a job to the queue. If there are no running jobs (i.e. no workers),
	/// then a worker will be created and immediately spawned
	async fn enqueue(self: Arc<Self>, job: Box<dyn Executor>) -> JobManagerResult<()> {
		let created_job = self
			.client
			.job()
			.create(
				job.id().to_string(),
				job.name().to_string(),
				vec![
					job::description::set(job.description()),
					job::status::set(JobStatus::Queued.to_string()),
				],
			)
			.exec()
			.await
			.map_err(|err| JobManagerError::JobPersistFailed(err.to_string()))?;
		tracing::trace!(?created_job, "Persisted job to database");

		let mut workers = self.workers.write().await;
		// If there are no running workers, just start the job
		if workers.is_empty() {
			let job_id = job.id().to_string();
			let worker = Worker::create_and_spawn(
				job,
				self.clone(),
				self.client.clone(),
				self.config.clone(),
				self.get_event_tx(),
				self.job_manager_tx.clone(),
			)
			.await?;
			workers.insert(job_id, worker);
			tracing::trace!("Worker created and added to workers map");
		} else {
			// Enqueue the job
			self.queue.write().await.push_back(job);
		}

		drop(workers);
		Ok(())
	}

	/// Attempts to enqueue the next job in the queue (if one exists)
	async fn auto_enqueue(self: Arc<Self>) {
		if let Some(next) = self.queue.write().await.pop_front() {
			self.job_manager_tx
				.send(JobManagerCommand::EnqueueJob(next))
				.map_or_else(
					|error| {
						tracing::error!(?error, "Failed to send event to job manager")
					},
					|_| tracing::trace!("Sent event to job manager to enqueue next job"),
				);
		} else {
			tracing::trace!("No jobs in queue to auto enqueue")
		}
	}

	/// Remove a worker by its associated job ID. This should only be called when a job
	/// is complete, regardless of its finalized status. If the job is already queued,
	/// nothing will happen.
	///
	/// Will attempt to dispatch the next job in the queue if one exists
	pub async fn complete(self: Arc<Self>, job_id: String) {
		self.workers.write().await.remove(&job_id).map_or_else(
			|| {
				tracing::error!(
					?job_id,
					"Failed to remove job from workers map! Did it exist?"
				);
			},
			|_| tracing::trace!("Removed worker for job from workers map"),
		);

		self.auto_enqueue().await;
	}

	/// Cancel a job by ID. If the job is not running but in the queue, it will be removed. If
	/// the job is running, it will be sent a shutdown signal. Otherwise, an error will be
	/// returned
	async fn cancel(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		let mut workers = self.workers.write().await;

		if let Some(worker) = workers.remove(&job_id) {
			worker.cancel().await;
			drop(workers);
			self.auto_enqueue().await;
		} else if let Some(index) = self.get_queued_job_index(&job_id).await {
			handle_do_cancel(job_id.clone(), &self.client, Duration::from_secs(0))
				.await?;
			self.queue.write().await.remove(index).map_or_else(
				|| {
					tracing::warn!(index, job_id, "Unexpected result: failed to remove job with existing index precondition");
				},
				|_| {
                    tracing::trace!(index, job_id, "Removed job from queue");
                },
			);
		} else {
			return Err(JobManagerError::JobNotFound(job_id));
		}

		Ok(())
	}

	async fn shutdown(self: Arc<Self>) {
		let workers = self.workers.read().await;
		join_all(workers.values().map(|worker| worker.cancel())).await;
	}

	/// Returns the index of a job in the pending queue by ID.
	async fn get_queued_job_index(&self, job_id: &str) -> Option<usize> {
		self.queue
			.read()
			.await
			.iter()
			.position(|job| job.id().to_string() == job_id)
	}
}
