use prisma_client_rust::Direction;
use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};
use tokio::sync::{broadcast, Mutex, RwLock};
use tracing::error;

use crate::{
	job::{utils::persist_new_job, WorkerCtx},
	prisma::job,
	CoreError, Ctx,
};

use super::{
	utils::update_job_status, worker::Worker, JobDetail, JobExecutorTrait, JobStatus,
};

#[derive(Debug, Clone)]
pub enum JobManagerShutdownSignal {
	All,
	Worker(String),
}

#[derive(Debug, thiserror::Error)]
pub enum JobManagerError {
	#[error("An communication error occurred {0}")]
	IPCError(#[from] broadcast::error::SendError<JobManagerShutdownSignal>),
	#[error("Worker not found {0}")]
	WorkerNotFound(String),
	#[error("Worker is in invalid state {0}")]
	WorkerInvalidState(String),
	#[error("Worker spawn failed")]
	WorkerSpawnFailed,
	#[error("Job not found {0}")]
	JobNotFound(String),
	#[error("Job missing ID")]
	JobMissingId,
	#[error("A query error occurred {0}")]
	QueryError(#[from] prisma_client_rust::QueryError),
	#[error("An unknown error occurred {0}")]
	Unknown(String),
}

impl From<CoreError> for JobManagerError {
	fn from(err: CoreError) -> Self {
		JobManagerError::Unknown(err.to_string())
	}
}

pub type JobManagerResult<T> = Result<T, JobManagerError>;

pub struct JobManager {
	/// Queue of jobs waiting to be run in a worker thread.
	job_queue: RwLock<VecDeque<Box<dyn JobExecutorTrait>>>,
	/// Worker threads with a running job.
	workers: RwLock<HashMap<String, Arc<Mutex<Worker>>>>,
	/// A channel to send shutdown signals to all or some workers.
	shutdown_tx: Arc<broadcast::Sender<JobManagerShutdownSignal>>,
	/// A pointer to the core context.
	core_ctx: Arc<Ctx>,
}

impl JobManager {
	pub fn new(core_ctx: Arc<Ctx>) -> Self {
		let (shutdown_tx, _) = broadcast::channel(1024);

		Self {
			job_queue: RwLock::new(VecDeque::new()),
			workers: RwLock::new(HashMap::new()),
			shutdown_tx: Arc::new(shutdown_tx),
			core_ctx,
		}
	}

	/// Wrap the job manager in an Arc.
	pub fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	/// Returns a reference to the shutdown signal sender.
	pub fn get_shutdown_tx(&self) -> Arc<broadcast::Sender<JobManagerShutdownSignal>> {
		Arc::clone(&self.shutdown_tx)
	}

	/// Cancels a job by ID. If the job is not running but in the queue, it will be removed.
	pub async fn cancel_job(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		tracing::trace!(job_id, "Attempting to cancel job");
		let mut workers = self.workers.write().await;
		if workers.get(&job_id).is_some() {
			tracing::trace!(job_id, "Sending shutdown signal to worker");
			self.shutdown_tx
				.send(JobManagerShutdownSignal::Worker(job_id.clone()))?;

			workers.remove(&job_id);
			drop(workers);
			return Ok(());
		}

		let mut job_queue = self.job_queue.write().await;
		let maybe_index = job_queue.iter().position(|job| {
			let job_detail = job
				.detail()
				.as_ref()
				.map(|job_detail| job_detail.id == job_id);

			job_detail.unwrap_or(false)
		});

		if let Some(job_index) = maybe_index {
			job_queue.remove(job_index);
			return Ok(());
		}

		Err(JobManagerError::WorkerNotFound(job_id))
	}

	/// DONT USE: This won't work as expected until pausing is supported. This will
	/// cancel the running job.
	pub async fn pause_job(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		let mut workers = self.workers.write().await;

		if workers.get(&job_id).is_some() {
			self.shutdown_tx
				.send(JobManagerShutdownSignal::Worker(job_id.clone()))?;
			workers.remove(&job_id);
			drop(workers);
			Ok(())
		} else {
			Err(JobManagerError::WorkerNotFound(job_id))
		}
	}

	/// Enqueues a job to be run in a worker thread.
	pub async fn enqueue_job(
		self: Arc<Self>,
		mut job: Box<dyn JobExecutorTrait>,
	) -> JobManagerResult<()> {
		let mut workers = self.workers.write().await;

		if workers.is_empty() {
			println!("Starting job: {}", job.name());

			let job_detail = job
				.detail_mut()
				.take()
				.expect("Job initialized without state!");

			let job_id = job_detail.id.clone();
			let job_name = job.name().to_string();
			let job_description = job.description().map(|s| s.to_string());
			let _ = persist_new_job(
				&self.core_ctx,
				job_id.clone(),
				job_name,
				job_description,
			)
			.await?;

			let worker = Worker::new(job, job_detail);
			let worker_mtx = Arc::new(Mutex::new(worker));
			let worker_ctx = WorkerCtx {
				job_id: job_id.clone(),
				shutdown_tx: self.get_shutdown_tx(),
				core_ctx: Arc::clone(&self.core_ctx),
			};

			Worker::spawn(worker_ctx, Arc::clone(&self), Arc::clone(&worker_mtx))
				.await
				.map_err(|e| {
					println!("Error spawning worker: {:?}", e);
					JobManagerError::WorkerSpawnFailed
				})?;
			workers.insert(job_id, worker_mtx);
		} else {
			println!("Queuing job: {}", job.name());
			self.job_queue.write().await.push_back(job);
		}

		drop(workers);
		Ok(())
	}

	/// Attempts to remove a worker by job ID. If the worker is not found, it is
	/// assumed to be in the pending queue and is removed from there.
	pub async fn dequeue_job(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		let remove_result = self.workers.write().await.remove(&job_id);

		if remove_result.is_none() {
			if let Some(index) = self.get_queued_job_index(&job_id).await {
				return self.dequeue_pending_job(index).await;
			}

			return Err(JobManagerError::WorkerNotFound(job_id));
		}

		let next_job = self.job_queue.write().await.pop_front();
		if let Some(job) = next_job {
			// TODO: error handling
			let _ = self.core_ctx.dispatch_job(job);
		}

		Ok(())
	}

	/// Removes a job from the pending queue by index.
	async fn dequeue_pending_job(self: Arc<Self>, index: usize) -> JobManagerResult<()> {
		let result = self.job_queue.write().await.remove(index);
		if let Some(job) = result {
			let job_id = job
				.detail()
				.as_ref()
				.map(|detail| detail.id.clone())
				.ok_or(JobManagerError::JobMissingId)?;

			update_job_status(&self.core_ctx, job_id, JobStatus::Cancelled).await?;
		}
		Ok(())
	}

	/// Clears the job queue. Will not cancel any jobs that are currently running.
	pub async fn clear_queue(self: Arc<Self>) {
		let writer = self.job_queue.write().await;

		let queued_job_ids = writer
			.iter()
			.map(|job| {
				let job_id = job
					.detail()
					.as_ref()
					.map(|detail| detail.id.clone())
					.ok_or(JobManagerError::JobMissingId);

				job_id
			})
			.filter_map(|job_id| job_id.ok())
			.collect::<Vec<String>>();
		let queued_job_count = queued_job_ids.len();
		tracing::debug!(queued_job_count, "Clearing job queue");

		let client = self.core_ctx.get_db();
		let result = client
			.job()
			.update_many(
				vec![job::id::in_vec(queued_job_ids)],
				vec![job::status::set(JobStatus::Cancelled.to_string())],
			)
			.exec()
			.await;
		if let Err(error) = result {
			error!(?error, "Failed to clear job queue");
		}
	}

	/// Returns the index of a job in the pending queue by ID.
	async fn get_queued_job_index(&self, job_id: &str) -> Option<usize> {
		let job_queue = self.job_queue.read().await;
		job_queue.iter().position(|job| {
			let job_detail = job
				.detail()
				.as_ref()
				.map(|job_detail| job_detail.id == job_id);
			job_detail.unwrap_or(false)
		})
	}

	// TODO: remove this...
	pub async fn report(self: Arc<Self>) -> JobManagerResult<Vec<JobDetail>> {
		let db = self.core_ctx.get_db();

		let jobs = db
			.job()
			.find_many(vec![])
			.order_by(job::completed_at::order(Direction::Desc))
			.exec()
			.await?
			.into_iter()
			.map(JobDetail::from)
			.collect::<Vec<JobDetail>>();

		Ok(jobs)
	}

	// TODO: this will eventually go away!
	pub async fn init(self: Arc<Self>) -> JobManagerResult<()> {
		let result = self
			.core_ctx
			.db
			.job()
			.update_many(
				vec![job::status::equals(JobStatus::Running.to_string())],
				vec![
					job::status::set(JobStatus::Cancelled.to_string()),
					job::completed_at::set(None),
				],
			)
			.exec()
			.await?;

		tracing::trace!(canceled_count = ?result, "Canceling running jobs on startup");

		Ok(())
	}

	/// Shuts down all workers and clears the job queue.
	pub async fn shutdown(self: Arc<Self>) {
		let workers = self.workers.read().await;
		if !workers.is_empty() {
			tracing::debug!(workers = workers.len(), "Shutting down workers");
			self.shutdown_tx
				.send(JobManagerShutdownSignal::All)
				.expect("Failed to send shutdown signal to workers");
		}
		drop(workers);
		self.clear_queue().await;
	}
}
