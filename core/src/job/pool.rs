use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
use tracing::{error, warn};

use super::{runner::Runner, Job, JobReport};
use crate::{config::context::Ctx, types::CoreResult};

// Note: this is 12 hours
pub const DEFAULT_SCAN_INTERVAL_IN_SEC: i64 = 43200;

pub enum JobPoolEvent {
	Init,
	EnqueueJob { job: Box<dyn Job> },
	CancelJob { job_id: String },
}

pub struct JobPool {
	core_ctx: Arc<Ctx>,
	job_queue: RwLock<VecDeque<Box<dyn Job>>>,
	job_runners: RwLock<HashMap<String, Arc<Mutex<Runner>>>>,
	internal_sender: mpsc::UnboundedSender<JobPoolEvent>,
	shutdown_tx: Arc<broadcast::Sender<()>>,
}

impl JobPool {
	/// Creates a new JobPool. Internally, two threads will be spawned: 1 to handle internal
	/// job pool events, and another for scheduled jobs.
	pub fn new(ctx: Ctx) -> Arc<Self> {
		let (internal_sender, mut internal_receiver) = mpsc::unbounded_channel();
		let (shutdown_tx, _shutdown_rx) = broadcast::channel(1);

		let pool = Arc::new(Self {
			core_ctx: ctx.arced(),
			job_queue: RwLock::new(VecDeque::new()),
			job_runners: RwLock::new(HashMap::new()),
			internal_sender,
			shutdown_tx: Arc::new(shutdown_tx),
		});

		let pool_cpy = pool.clone();
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
			JobPoolEvent::EnqueueJob { job } => self_cpy.enqueue_job(job).await,
			JobPoolEvent::CancelJob { .. } => {
				self_cpy.shutdown_tx.send(()).unwrap();
				// warn!("TODO: unimplemented. This event will handle cancelling a job");
			},
		}
	}

	pub fn shutdown_rx(&self) -> Arc<broadcast::Receiver<()>> {
		Arc::new(self.shutdown_tx.subscribe())
	}

	/// Adds a new job to the job queue. If the queue is empty, it will immediately get
	/// run.
	pub async fn enqueue_job(self: Arc<Self>, job: Box<dyn Job>) {
		println!("Enqueuing job...");
		let mut job_runners = self.job_runners.write().await;

		if job_runners.is_empty() {
			// wait 150 ms before starting the job, otherwise the client gets overloaded with the derendering of UI elements
			// while receiving an enormous amount of data from the core immediately after the job is started
			tokio::time::sleep(std::time::Duration::from_millis(150)).await;

			let runner = Runner::new(&self.core_ctx, job).await;
			let runner_id = runner.id.clone();

			let runner_arc = Arc::new(Mutex::new(runner));

			Runner::spawn(
				Arc::clone(&self),
				Arc::clone(&runner_arc),
				self.core_ctx.get_ctx(),
			)
			.await;

			job_runners.insert(runner_id, runner_arc);
		} else {
			self.job_queue.write().await.push_back(job);
		}

		drop(job_runners);
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
		// check queue first, if job is in queue just remove it
		// TODO: replace with some method on the Runner struct that handles
		// removing job from DB...
		if self.job_runners.read().await.get(&runner_id).is_some() {
			self.job_runners.write().await.remove(&runner_id);

			return Ok(());
		}

		self.internal_sender
			.send(JobPoolEvent::CancelJob { job_id: runner_id })
			.unwrap_or_else(|e| error!("Failed to cancel job: {}", e.to_string()));

		Ok(())
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
