use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};
use tokio::sync::{broadcast, Mutex, RwLock};

use crate::{job::WorkerCtx, Ctx};

use super::{worker::Worker, JobExecutorTrait};

// TODO: add pause variant for a single worker.
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

	pub fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	pub fn get_shutdown_tx(&self) -> Arc<broadcast::Sender<JobManagerShutdownSignal>> {
		Arc::clone(&self.shutdown_tx)
	}

	pub async fn cancel_job(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		let mut workers = self.workers.write().await;
		if workers.get(&job_id).is_some() {
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

	async fn dequeue_pending_job(self: Arc<Self>, index: usize) -> JobManagerResult<()> {
		self.job_queue.write().await.remove(index);
		Ok(())
	}

	/// Clears the job queue. Will not cancel any jobs that are currently running.
	pub async fn clear_queue(self: Arc<Self>) {
		self.job_queue.write().await.clear();
	}

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

	// pub async fn report(self: Arc<Self>) -> CoreResult<Vec<JobReport>> {
	// 	let db = self.core_ctx.get_db();

	// 	let mut jobs = db
	// 		.job()
	// 		.find_many(vec![])
	// 		.order_by(job::completed_at::order(Direction::Desc))
	// 		.exec()
	// 		.await?
	// 		.into_iter()
	// 		.map(JobReport::from)
	// 		.collect::<Vec<JobReport>>();

	// 	jobs.append(
	// 		&mut self
	// 			.job_queue
	// 			.write()
	// 			.await
	// 			.iter()
	// 			.map(JobReport::from)
	// 			.collect::<Vec<JobReport>>(),
	// 	);

	// 	Ok(jobs)
	// }
}
