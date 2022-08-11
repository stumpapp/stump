use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};

use prisma_client_rust::chrono;
use rocket::tokio;
use tokio::sync::{mpsc, Mutex, RwLock};

use crate::{config::context::Ctx, types::alias::ApiResult};

use super::{runner::Runner, Job, JobReport};

// Note: this is 12 hours
pub const DEFAULT_SCAN_INTERVAL_IN_SEC: i64 = 43200;

pub enum JobPoolEvent {
	EnqueueJob(Ctx, Box<dyn Job>),
}

pub struct JobPool {
	job_queue: RwLock<VecDeque<Box<dyn Job>>>,
	job_runners: RwLock<HashMap<String, Arc<Mutex<Runner>>>>,
	internal_sender: mpsc::UnboundedSender<JobPoolEvent>,
}

impl JobPool {
	/// Creates a new JobPool. Internally, two threads will be spawned: 1 to handle internal
	/// job pool events, and another for scheduled jobs.
	pub fn new() -> Arc<Self> {
		let (internal_sender, mut internal_receiver) = mpsc::unbounded_channel();

		let pool = Arc::new(Self {
			job_queue: RwLock::new(VecDeque::new()),
			job_runners: RwLock::new(HashMap::new()),
			internal_sender,
		});

		let pool_cpy = pool.clone();
		tokio::spawn(async move {
			while let Some(e) = internal_receiver.recv().await {
				match e {
					JobPoolEvent::EnqueueJob(ctx, job) => {
						pool_cpy.clone().enqueue_job(&ctx, job).await
					},
				}
			}
		});

		// TODO: Not sure I ~love~ spawning again, but we shall see.
		// let pool_cpy = pool.clone();
		tokio::spawn(async move {
			let interval: i64 = std::env::var("SCAN_INTERVAL")
				.map(|val| val.parse::<i64>().unwrap_or(DEFAULT_SCAN_INTERVAL_IN_SEC))
				.unwrap_or(DEFAULT_SCAN_INTERVAL_IN_SEC);

			let mut timer = tokio::time::interval(
				chrono::Duration::seconds(interval).to_std().unwrap(),
			);
			loop {
				timer.tick().await;

				log::debug!("TODO: implement new scanner that scans all libraries!");

				// pool_cpy.clone().enqueue_job(&ctx, AllLibrariesScanJob {}).await
			}
		});

		pool
	}

	/// Adds a new job to the job queue. If the queue is empty, it will immediately get
	/// run.
	pub async fn enqueue_job(self: Arc<Self>, ctx: &Ctx, job: Box<dyn Job>) {
		let mut job_runners = self.job_runners.write().await;

		if job_runners.is_empty() {
			let runner = Runner::new(ctx, job).await;
			let runner_id = runner.id.clone();

			let runner_arc = Arc::new(Mutex::new(runner));

			Runner::spawn(Arc::clone(&self), Arc::clone(&runner_arc), ctx.get_ctx())
				.await;

			job_runners.insert(runner_id, runner_arc);
		} else {
			self.job_queue.write().await.push_back(job);
		}
	}

	/// Removes a job by its runner id. It will attempt to queue the next job,
	/// if there is one, by emiting a JobPoolEvent to the JobPool's internal sender.
	pub async fn dequeue_job(self: Arc<Self>, ctx: &Ctx, runner_id: String) {
		self.job_runners.write().await.remove(&runner_id);

		let next_job = self.job_queue.write().await.pop_front();

		if let Some(job) = next_job {
			self.internal_sender
				.send(JobPoolEvent::EnqueueJob(ctx.get_ctx(), job))
				.unwrap_or_else(|e| {
					log::error!("Failed to queue next job: {}", e.to_string())
				})
		}
	}

	/// Clears the job queue.
	pub async fn clear_queue(self: Arc<Self>, _ctx: &Ctx) {
		self.job_queue.write().await.clear();
	}

	/// Returns a vector of JobReport for all persisted jobs, and appends the JobReports
	/// for jobs in the job queue.
	pub async fn report(self: Arc<Self>, ctx: &Ctx) -> ApiResult<Vec<JobReport>> {
		let db = ctx.get_db();

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
