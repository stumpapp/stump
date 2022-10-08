use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::{
	self,
	sync::{broadcast, Mutex},
};
use tracing::error;

use crate::{config::context::Ctx, event::CoreEvent};

use super::{persist_new_job, pool::JobPool, Job, JobUpdate, JobWrapper};

#[derive(Clone, Serialize, Deserialize)]
pub enum RunnerEvent {
	Progress(Vec<JobUpdate>),
	Completed,
	Failed,
}

#[derive(Clone)]
pub struct RunnerCtx {
	pub runner_id: String,
	pub core_ctx: Ctx,
	pub progress_tx: Arc<broadcast::Sender<JobUpdate>>,
}

impl RunnerCtx {
	pub fn new(ctx: Ctx, id: String) -> Self {
		let (progress_tx, _) = broadcast::channel(1024);

		RunnerCtx {
			runner_id: id,
			core_ctx: ctx,
			progress_tx: Arc::new(progress_tx),
		}
	}

	pub fn progress(&self, e: JobUpdate) {
		let _ = self.progress_tx.send(e);
		// .expect("Fatal error: failed to send job progress event.");
	}
}

pub struct Runner {
	pub id: String,
	job: Option<Box<dyn Job>>,
	handle: Option<tokio::task::JoinHandle<()>>,
}

impl Runner {
	pub fn create_id() -> String {
		cuid::cuid().expect("Failed to generate CUID for runner.")
	}

	pub async fn new(ctx: &Ctx, job: Box<dyn Job>) -> Self {
		let id = Runner::create_id();

		// FIXME: error handling
		let _ = persist_new_job(ctx, id.clone(), job.as_ref()).await;

		Runner {
			id,
			job: Some(job),
			handle: None,
		}
	}

	// FIXME: don't panic, return error here
	pub async fn spawn(job_pool: Arc<JobPool>, runner_arc: Arc<Mutex<Self>>, ctx: Ctx) {
		let mut runner = runner_arc.lock().await;
		let runner_id = runner.id.clone();

		let job = runner
			.job
			.take()
			.unwrap_or_else(|| panic!("Missing job in job runner {}", runner_id));

		drop(runner);

		let handle = tokio::spawn(async move {
			let runner_id = runner_id.clone();
			let runner_ctx = RunnerCtx::new(ctx.clone(), runner_id.clone());
			let mut job_wrapper = JobWrapper::new(job);

			if let Err(e) = job_wrapper.run(runner_ctx).await {
				error!("job failed {:?}", e);

				ctx.handle_failure_event(CoreEvent::JobFailed {
					runner_id: runner_id.clone(),
					message: e.to_string(),
				})
				.await;
			} else {
				ctx.emit_client_event(CoreEvent::JobComplete(runner_id.clone()));
			}

			job_pool.dequeue_job(runner_id).await;
		});

		runner_arc.lock().await.handle = Some(handle);
		drop(runner_arc);
	}

	pub fn shutdown(&mut self) -> bool {
		if let Some(handle) = self.handle.take() {
			println!("Shutting down job runner {}", self.id);
			handle.abort();
			true
		} else {
			false
		}
	}

	// TODO: function to persist to DB
	// TODO: function to remove from DB
}
