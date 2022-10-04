use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::{self, sync::Mutex};
use tracing::error;

use crate::{config::context::Ctx, event::CoreEvent};

use super::{persist_new_job, pool::JobPool, Job, JobUpdate};

#[derive(Clone, Serialize, Deserialize)]
pub enum RunnerEvent {
	Progress(Vec<JobUpdate>),
	Completed,
	Failed,
}

pub struct Runner {
	pub id: String,
	job: Option<Box<dyn Job>>,
}

impl Runner {
	pub fn create_id() -> String {
		cuid::cuid().expect("Failed to generate CUID for runner.")
	}

	pub async fn new(ctx: &Ctx, job: Box<dyn Job>) -> Self {
		let id = Runner::create_id();

		// FIXME: error handling
		let _ = persist_new_job(ctx, id.clone(), job.as_ref()).await;

		Runner { id, job: Some(job) }
	}

	// FIXME: don't panic, return error here
	pub async fn spawn(job_pool: Arc<JobPool>, runner_arc: Arc<Mutex<Self>>, ctx: Ctx) {
		let mut runner = runner_arc.lock().await;
		let runner_id = runner.id.clone();

		let job = runner
			.job
			.take()
			.unwrap_or_else(|| panic!("Missing job in job runner {}", runner_id));

		tokio::spawn(async move {
			let runner_id = runner_id.clone();

			if let Err(e) = job.run(runner_id.clone(), ctx.get_ctx()).await {
				error!("job failed {:?}", e);

				ctx.handle_failure_event(CoreEvent::JobFailed {
					runner_id: runner_id.clone(),
					message: e.to_string(),
				})
				.await;
			} else {
				ctx.emit_client_event(CoreEvent::JobComplete(runner_id.clone()));
			}

			job_pool.dequeue_job(&ctx, runner_id).await;
		});
	}
}
