use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};

use rocket::tokio;
use tokio::sync::{mpsc, Mutex, RwLock};

use crate::{config::context::Ctx, job::JobStatus, types::alias::ApiResult};

use super::{runner::Runner, Job, JobReport};

pub enum JobPoolEvent {
	EnqueueJob(Ctx, Box<dyn Job>),
}

pub struct JobPool {
	job_queue: RwLock<VecDeque<Box<dyn Job>>>,
	job_runners: RwLock<HashMap<String, Arc<Mutex<Runner>>>>,
	internal_sender: mpsc::UnboundedSender<JobPoolEvent>,
}

impl JobPool {
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

		pool
	}

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

	pub async fn dequeue_job(self: Arc<Self>, ctx: &Ctx, job_id: String) {
		self.job_runners.write().await.remove(&job_id);

		let next_job = self.job_queue.write().await.pop_front();

		if let Some(job) = next_job {
			self.internal_sender
				.send(JobPoolEvent::EnqueueJob(ctx.get_ctx(), job))
				.unwrap_or_else(|e| {
					log::error!("Failed to queue next job: {}", e.to_string())
				})
		}
	}

	pub async fn clear_queue(self: Arc<Self>, _ctx: &Ctx) {
		self.job_queue.write().await.clear();
	}

	pub async fn report(self: Arc<Self>, ctx: &Ctx) -> ApiResult<Vec<JobReport>> {
		// use crate::prisma::job;

		let db = ctx.get_db();
		// let job_runners = self.job_runners.write().await;

		// let runner_ids: Vec<String> =
		// 	job_runners.iter().map(|(id, _)| id.clone()).collect();

		// note: this will really only be one job...
		let mut jobs = db
			.job()
			// .find_many(vec![job::id::in_vec(runner_ids)])
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
