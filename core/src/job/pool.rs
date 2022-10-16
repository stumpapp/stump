use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};
use tokio::sync::{mpsc, Mutex, RwLock};
use tracing::{error, warn};

use super::{persist_job_cancelled, runner::Runner, Job, JobReport};
use crate::{
	config::context::Ctx,
	event::CoreEvent,
	types::{CoreError, CoreResult},
};

// Note: this is 12 hours
pub const DEFAULT_SCAN_INTERVAL_IN_SEC: i64 = 43200;

pub enum JobPoolEvent {
	Init,
	EnqueueJob { job: Box<dyn Job> },
	// TODO: I only really need this if another JobPool method needs to
	// be able to cancel internally. TBD.
	// CancelJob { job_id: String },
}

pub struct JobPool {
	core_ctx: Arc<Ctx>,
	// TODO: I think maybe this should be Runners in the queue. That way,
	// I can search by ID to cancel a job before it's even started.
	job_queue: RwLock<VecDeque<Box<dyn Job>>>,
	job_runners: RwLock<HashMap<String, Arc<Mutex<Runner>>>>,
	internal_sender: mpsc::UnboundedSender<JobPoolEvent>,
}

impl JobPool {
	/// Creates a new JobPool. Internally, two threads will be spawned: 1 to handle internal
	/// job pool events, and another for scheduled jobs.
	pub fn new(ctx: Ctx) -> Arc<Self> {
		let (internal_sender, mut internal_receiver) = mpsc::unbounded_channel();

		let pool = Arc::new(Self {
			core_ctx: ctx.arced(),
			job_queue: RwLock::new(VecDeque::new()),
			job_runners: RwLock::new(HashMap::new()),
			internal_sender,
		});

		let pool_cpy = pool.clone();
		// TODO: I think I should merge this with event manager. Spawning
		// yet another new thread just for a smaller set of events is silly.
		tokio::spawn(async move {
			while let Some(e) = internal_receiver.recv().await {
				pool_cpy.clone().handle_task(e).await;
			}
		});

		pool
	}

	async fn handle_task(self: Arc<Self>, task: JobPoolEvent) {
		let self_cpy = self.clone();
		match task {
			JobPoolEvent::Init => {
				warn!("TODO: unimplemented. This event will handle readding queued jobs on the event the server was stopped before they were completed");
			},
			JobPoolEvent::EnqueueJob { job } => self_cpy
				.enqueue_job(job)
				.await
				.unwrap_or_else(|e| error!("Failed to enqueue job: {}", e)),
		}
	}

	/// Adds a new job to the job queue. If the queue is empty, it will immediately get
	/// run.
	pub async fn enqueue_job(self: Arc<Self>, job: Box<dyn Job>) -> CoreResult<()> {
		let mut job_runners = self.job_runners.write().await;

		if job_runners.is_empty() {
			// wait 50 ms before starting the job, otherwise the client gets overloaded with the derendering of UI elements
			// while receiving an enormous amount of data from the core immediately after the job is started
			tokio::time::sleep(std::time::Duration::from_millis(50)).await;

			let runner = Runner::new(&self.core_ctx, job).await;
			let runner_id = runner.id.clone();

			let runner_arc = Arc::new(Mutex::new(runner));

			Runner::spawn(
				Arc::clone(&self),
				Arc::clone(&runner_arc),
				self.core_ctx.get_ctx(),
			)
			.await?;

			job_runners.insert(runner_id, runner_arc);
		} else {
			self.job_queue.write().await.push_back(job);
		}

		drop(job_runners);
		Ok(())
	}

	/// Removes a job by its runner id. It will attempt to queue the next job,
	/// if there is one, by emiting a JobPoolEvent to the JobPool's internal sender.
	pub async fn dequeue_job(self: Arc<Self>, runner_id: String) {
		self.job_runners.write().await.remove(&runner_id);

		let next_job = self.job_queue.write().await.pop_front();

		if let Some(job) = next_job {
			self.internal_sender
				.send(JobPoolEvent::EnqueueJob { job })
				.unwrap_or_else(|e| error!("Failed to queue next job: {}", e.to_string()))
		}
	}

	pub async fn cancel_job(self: Arc<Self>, runner_id: String) -> CoreResult<()> {
		if let Some(runner) = self.job_runners.write().await.remove(&runner_id) {
			if runner.lock().await.shutdown() {
				// Tell the UI that the job was cancelled
				self.core_ctx.emit_client_event(CoreEvent::JobFailed {
					runner_id: runner_id.clone(),
					message: "Job cancelled".to_string(),
				});

				// Persist the job as cancelled
				if let Err(err) = persist_job_cancelled(&self.core_ctx, runner_id).await {
					error!("Failed to persist job cancellation: {}", err);
				}

				drop(runner);
				Ok(())
			} else {
				Err(CoreError::Unknown(
					"Failed to cancel job. It may have already completed.".to_string(),
				))
			}
		} else {
			Err(CoreError::NotFound(
				"Failed to cancel job, it was not found.".to_string(),
			))
		}
	}

	/// Clears the job queue.
	pub async fn clear_queue(self: Arc<Self>, _ctx: &Ctx) {
		self.job_queue.write().await.clear();
	}

	/// Returns a vector of JobReport for all persisted jobs, and appends the JobReports
	/// for jobs in the job queue.
	pub async fn report(self: Arc<Self>) -> CoreResult<Vec<JobReport>> {
		let db = self.core_ctx.get_db();

		let mut jobs = db
			.job()
			.find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(JobReport::from)
			.collect::<Vec<JobReport>>();

		jobs.append(
			&mut self
				.job_queue
				.write()
				.await
				.iter()
				.map(JobReport::from)
				.collect::<Vec<JobReport>>(),
		);

		Ok(jobs)
	}
}
