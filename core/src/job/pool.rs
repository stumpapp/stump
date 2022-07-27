use std::{
	collections::{HashMap, VecDeque},
	sync::Arc,
};

use rocket::tokio;
use tokio::sync::{mpsc, Mutex, RwLock};

use crate::config::context::Ctx;

use super::{runner::Runner, Job};

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

	pub async fn enqueue_job(self: Arc<Self>, ctx: &Ctx, mut job: Box<dyn Job>) {
		let mut job_runners = self.job_runners.write().await;

		if job_runners.len() == 0 {
			let runner = Runner::new(job);
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
}
