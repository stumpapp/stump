use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};

use futures::future::join_all;
use models::entity::job;
use sea_orm::{
	prelude::*, sea_query::OnConflict, sqlx::types::chrono::Utc, ActiveValue::Set,
	DatabaseConnection,
};
use tokio::sync::{broadcast, mpsc, RwLock};

use super::{error::JobManagerError, Executor, JobControllerCommand, Worker};
use crate::{config::StumpConfig, event::CoreEvent, job::JobStatus};

pub type JobManagerResult<T> = Result<T, JobManagerError>;

/// A helper struct that holds the job queue and a list of [`Worker`]s.
pub struct JobManager {
	/// Queue of jobs waiting to be run in a worker thread
	queue: RwLock<VecDeque<Box<dyn Executor>>>,
	/// Worker threads with a running job
	workers: RwLock<HashMap<String, Arc<Worker>>>,
	/// A channel to send shutdown signals to the parent [`JobManager`]
	job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
	/// A channel to emit core events
	core_event_tx: broadcast::Sender<CoreEvent>,
	/// A pointer to the database client
	conn: Arc<DatabaseConnection>,
	/// A pointer to the core config
	config: Arc<StumpConfig>,
}

impl JobManager {
	/// Creates a new Jobs instance
	pub fn new(
		conn: Arc<DatabaseConnection>,
		config: Arc<StumpConfig>,
		job_controller_tx: mpsc::UnboundedSender<JobControllerCommand>,
		core_event_tx: broadcast::Sender<CoreEvent>,
	) -> Self {
		Self {
			queue: RwLock::new(VecDeque::new()),
			workers: RwLock::new(HashMap::new()),
			job_controller_tx,
			core_event_tx,
			conn,
			config,
		}
	}

	/// Take ownership of self and return it wrapped in an Arc
	pub fn arced(self) -> Arc<Self> {
		Arc::new(self)
	}

	/// Get a reference to the event broadcaster
	fn get_event_tx(&self) -> broadcast::Sender<CoreEvent> {
		self.core_event_tx.clone()
	}

	/// Initialize the job manager. This will attempt to cancel any islanded jobs and re-enqueue
	/// any paused jobs
	pub async fn initialize(self: Arc<Self>) -> JobManagerResult<()> {
		let conn = self.conn.as_ref();

		let affected_rows = job::Entity::update_many()
			.filter(job::Column::Status.eq(JobStatus::Running.to_string()))
			.col_expr(
				job::Column::Status,
				Expr::value(JobStatus::Cancelled.to_string()),
			)
			.col_expr(
				job::Column::CompletedAt,
				Expr::value(Some(Utc::now().to_rfc3339())),
			)
			.exec(conn)
			.await
			.map_err(|err| JobManagerError::JobPersistFailed(err.to_string()))?
			.rows_affected;

		tracing::debug!(affected_rows, "Cancelled islanded jobs");

		Ok(())
	}

	// FIXME: there is a bug in here I haven't been able to track down,
	// it only presents when I enable thumbnails and the scanner auto-enqueues
	// a follow-up job

	/// Add a job to the queue. If there are no running jobs (i.e. no workers),
	/// then a worker will be created and immediately spawned
	pub async fn enqueue(
		self: Arc<Self>,
		job: Box<dyn Executor>,
	) -> JobManagerResult<()> {
		let job_id = job.id().to_string();

		if self.job_already_exists(&job_id).await {
			tracing::warn!(?job_id, "Job already exists in queue or is running!");
			return Err(JobManagerError::JobAlreadyExists(job_id));
		}

		let active_model = job::ActiveModel {
			id: Set(job.id().to_string()),
			name: Set(job.name().to_string()),
			description: Set(job.description()),
			status: Set(JobStatus::Queued),
			created_at: Set(Utc::now().into()),
			ms_elapsed: Set(0),
			..Default::default()
		};
		let created_job = job::Entity::insert(active_model)
			// Note: This needs to be an "upsert" since jobs get written when
			// added to queue, and so they would exist when re-queued for execution
			// which causes a conflict and throws
			.on_conflict(
				OnConflict::new()
					.update_column(job::Column::Status)
					.to_owned(),
			)
			.exec(self.conn.as_ref())
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
				self.conn.clone(),
				self.config.clone(),
				self.get_event_tx(),
				self.job_controller_tx.clone(),
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
	pub async fn auto_enqueue(self: Arc<Self>) {
		if let Some(next) = self.queue.write().await.pop_front() {
			self.job_controller_tx
				.send(JobControllerCommand::EnqueueJob(next))
				.map_or_else(
					|error| {
						tracing::error!(?error, "Failed to send event to job manager");
					},
					|_| tracing::trace!("Sent event to job manager to enqueue next job"),
				);
		} else {
			tracing::trace!("No jobs in queue to auto enqueue");
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
	pub async fn cancel(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		let mut workers = self.workers.write().await;

		if let Some(worker) = workers.remove(&job_id) {
			worker.cancel().await;
			drop(workers);
			self.auto_enqueue().await;
		} else if let Some(index) = self.get_queued_job_index(&job_id).await {
			job::Entity::update_many()
				.filter(job::Column::Id.eq(job_id.clone()))
				.col_expr(
					job::Column::Status,
					Expr::value(JobStatus::Cancelled.to_string()),
				)
				.exec(self.conn.as_ref())
				.await
				.map_err(|err| JobManagerError::JobPersistFailed(err.to_string()))?;

			self.queue.write().await.remove(index).map_or_else(
				|| {
					tracing::warn!(index, job_id, "Unexpected result: failed to remove job with existing index precondition");
				},
				|_| {
                    tracing::trace!(index, job_id, "Removed job from queue");
                },
			);
		} else {
			let affected_rows = job::Entity::update_many()
				.filter(job::Column::Id.eq(job_id.clone()))
				.col_expr(
					job::Column::Status,
					Expr::value(JobStatus::Cancelled.to_string()),
				)
				.exec(self.conn.as_ref())
				.await
				.map_err(|err| JobManagerError::JobPersistFailed(err.to_string()))?
				.rows_affected;

			if affected_rows == 0 {
				return Err(JobManagerError::JobNotFound(job_id));
			}

			return Err(JobManagerError::JobLostError);
		}

		Ok(())
	}

	/// Pause a job by ID. This operation does not check the queue
	pub async fn pause(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		let worker = self.get_worker(&job_id).await?;
		worker.pause().await;
		Ok(())
	}

	/// Resume a job by ID. This operation does not check the queue
	pub async fn resume(self: Arc<Self>, job_id: String) -> JobManagerResult<()> {
		let worker = self.get_worker(&job_id).await?;
		worker.resume().await;
		Ok(())
	}

	/// Get a worker by ID, if it exists
	async fn get_worker(self: Arc<Self>, id: &str) -> JobManagerResult<Arc<Worker>> {
		self.workers.read().await.get(id).map_or_else(
			|| Err(JobManagerError::JobNotFound(id.to_string())),
			|worker| Ok(worker.clone()),
		)
	}

	/// Shutdown all workers and the job manager. This will be called when the application
	/// is shutting down
	pub async fn shutdown(self: Arc<Self>) {
		let workers = self.workers.read().await;
		join_all(workers.values().map(|worker| worker.cancel())).await;
	}

	async fn job_already_exists(&self, job_id: &str) -> bool {
		self.workers.read().await.contains_key(job_id)
			|| self.get_queued_job_index(job_id).await.is_some()
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
