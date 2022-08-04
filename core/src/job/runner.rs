use std::sync::Arc;

use rocket::tokio::{self, sync::Mutex};
use serde::{Deserialize, Serialize};

use crate::{config::context::Ctx, event::ClientEvent};

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
		cuid::cuid()
			.expect("Failed to generate CUID for runner.")
			.to_string()
	}

	pub async fn new(ctx: &Ctx, job: Box<dyn Job>) -> Self {
		let id = Runner::create_id();

		// FIXME: error handling
		let _ = persist_new_job(ctx, id.clone(), &job).await;

		Runner { id, job: Some(job) }
	}

	pub async fn spawn(job_pool: Arc<JobPool>, runner_arc: Arc<Mutex<Self>>, ctx: Ctx) {
		let mut runner = runner_arc.lock().await;
		let runner_id = runner.id.clone();

		let job = runner
			.job
			.take()
			.expect(&format!("Missing job in job runner {}", runner_id));

		tokio::spawn(async move {
			let runner_id = runner_id.clone();

			if let Err(e) = job.run(runner_id.clone(), ctx.get_ctx()).await {
				log::error!("job failed {:?}", e);

				ctx.emit_client_event(ClientEvent::JobFailed((
					runner_id.clone(),
					e.to_string(),
				)));
			} else {
				ctx.emit_client_event(ClientEvent::JobComplete(runner_id.clone()));
			}

			job_pool.dequeue_job(&ctx, runner_id).await;
		});
	}
}
