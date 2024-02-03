use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};

use futures::future::join_all;
use tokio::sync::{mpsc, oneshot, RwLock};

use super::{error::JobManagerError, JobExecutor, Worker, WorkerEvent};
use crate::{config::StumpConfig, Ctx};

/// Events that can be sent to the job manager. If any of these events require a response,
/// e.g. to provide an HTTP status code, a oneshot channel should be provided.
pub enum JobManagerEvent {
	/// Add a job to the queue to be run
	EnqueueJob(Box<dyn JobExecutor>),
	/// A job has been completed and should be removed from the queue
	CompleteJob(String),
	/// Cancel a job by its ID
	CancelJob(String, oneshot::Sender<JobManagerResult<()>>),
	/// Shutdown the job manager. This will cancel all running jobs and clear the queue
	Shutdown(oneshot::Sender<()>),
}

type JobManagerResult<T> = Result<T, JobManagerError>;

/// A struct that manages the execution and queueing of jobs and their workers
pub struct JobManager {
	agent: Arc<JobManagerAgent>,
	/// A channel to receive job manager events
	internal_receiver: mpsc::UnboundedReceiver<JobManagerEvent>,
}

impl JobManager {
	/// Creates a new job manager instance
	pub fn new(
		event_channel: (
			mpsc::UnboundedReceiver<JobManagerEvent>,
			mpsc::UnboundedSender<JobManagerEvent>,
		),
		ctx: Arc<Ctx>,
		config: Arc<StumpConfig>,
	) -> Self {
		let (internal_receiver, internal_sender) = event_channel;
		Self {
			internal_receiver,
			agent: JobManagerAgent::new(internal_sender, ctx, config).arced(),
		}
	}

	/// Starts the watcher loop for the job manager
	pub fn start(mut self) {
		tokio::spawn(async move {
			while let Some(event) = self.internal_receiver.recv().await {
				match event {
					JobManagerEvent::EnqueueJob(job) => {
						self.agent.clone().enqueue(job).await;
					},
					JobManagerEvent::CompleteJob(job_id) => {
						self.agent.clone().complete(job_id).await;
					},
					JobManagerEvent::CancelJob(job_id, tx) => {
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
					JobManagerEvent::Shutdown(return_sender) => {
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
}

/// A helper struct that holds the job queue and a list of workers for the job manager
pub struct JobManagerAgent {
	/// Queue of jobs waiting to be run in a worker thread
	queue: RwLock<VecDeque<Box<dyn JobExecutor>>>,
	/// Worker threads with a running job
	workers: RwLock<HashMap<String, Arc<Worker>>>,
	/// A channel to send shutdown signals to the parent job manager
	job_manager_tx: mpsc::UnboundedSender<JobManagerEvent>,
	/// A pointer to the core context
	core_ctx: Arc<Ctx>,
	/// A pointer to the core config
	config: Arc<StumpConfig>,
}

impl JobManagerAgent {
	/// Creates a new Jobs instance
	pub fn new(
		job_manager_tx: mpsc::UnboundedSender<JobManagerEvent>,
		core_ctx: Arc<Ctx>,
		config: Arc<StumpConfig>,
	) -> Self {
		Self {
			queue: RwLock::new(VecDeque::new()),
			workers: RwLock::new(HashMap::new()),
			job_manager_tx,
			core_ctx,
			config,
		}
	}

	/// Take ownership of self and return it wrapped in an Arc
	pub fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	// TODO: result return
	/// Add a job to the queue. If there are no running jobs (i.e. no workers),
	/// then a worker will be created and immediately spawned
	async fn enqueue(self: Arc<Self>, job: Box<dyn JobExecutor>) {
		// TODO: Persist the job to the database somewhere

		let mut workers = self.workers.write().await;

		// If there are no running workers, just start the job
		if workers.is_empty() {
			let job_id = job.id().to_string();
			Worker::create_and_spawn(
				job,
				self.clone(),
				self.core_ctx.db.clone(),
				self.config.clone(),
				// FIXME: Don't do this, should come from core_ctx?
				async_channel::unbounded().0,
			)
			.await
			.map_or_else(
				|error| {
					tracing::error!(?error, "Failed to create worker for job");
				},
				|worker| {
					workers.insert(job_id, worker);
					tracing::trace!("Worker created and added to workers map");
				},
			);
		} else {
			// Enqueue the job
			self.queue.write().await.push_back(job);
		}

		drop(workers);
	}

	/// Attempts to enqueue the next job in the queue (if one exists)
	async fn auto_enqueue(self: Arc<Self>) {
		if let Some(next) = self.queue.write().await.pop_front() {
			self.job_manager_tx
				.send(JobManagerEvent::EnqueueJob(next))
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
	/// is complete. If the job is queued, nothing will happen.
	///
	/// Will attempt to dispatch the next job in the queue if one exists
	pub async fn complete(self: Arc<Self>, job_id: String) {
		self.workers.write().await.remove(&job_id).map_or_else(
			|| {
				tracing::error!("Failed to remove job from workers map");
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
		// let job_queue = self.job_queue.read().await;
		// job_queue.iter().position(|job| {
		// 	let job_detail = job
		// 		.detail()
		// 		.as_ref()
		// 		.map(|job_detail| job_detail.id == job_id);
		// 	job_detail.unwrap_or(false)
		// })
		None
	}
}
