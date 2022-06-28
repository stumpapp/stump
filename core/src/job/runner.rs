use std::sync::Arc;

use rocket::tokio::{self, sync::Mutex};
use serde::{Deserialize, Serialize};

use crate::{config::context::Context, types::event::InternalEvent};

use super::{Job, JobUpdate};

#[derive(Clone, Serialize, Deserialize)]
pub enum RunnerEvent {
	Progress(Vec<JobUpdate>),
	Completed,
	Failed,
}

enum RunnerState {
	Pending(Box<dyn Job>),
	Running,
}

pub struct Runner {
	pub id: String,
	// pub is_running: bool,
	state: RunnerState,
}

impl Runner {
	pub fn new(job: Box<dyn Job>) -> Self {
		Runner {
			id: cuid::cuid().unwrap().to_string(),
			// is_running: false,
			state: RunnerState::Pending(job),
		}
	}

	// fn set_running(&mut self, running: bool) {
	// 	self.is_running = running;
	// }

	pub async fn spawn(runner: Arc<Mutex<Self>>, ctx: Context) {
		let mut runner_mut = runner.lock().await;

		let runner_id = runner_mut.id.clone();

		// runner_mut.set_running(true);

		let job = match std::mem::replace(&mut runner_mut.state, RunnerState::Running) {
			RunnerState::Pending(job) => {
				runner_mut.state = RunnerState::Running;
				job
			},
			RunnerState::Running => unreachable!(),
		};

		tokio::spawn(async move {
			let result = job.run(runner_id.clone(), ctx.get_ctx()).await;

			if let Err(e) = result {
				log::error!("job failed {:?}", e);
				ctx.emit_event(InternalEvent::JobFailed(runner_id, e));
			} else {
				ctx.emit_event(InternalEvent::JobComplete(runner_id));
			}
		});
	}
}
