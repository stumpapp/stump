pub mod scan;

use std::{collections::HashMap, sync::Arc};

use rocket::tokio::sync::Mutex;

use crate::config::context::Context;

use super::{runner::Runner, Job};

pub struct Jobs {
	queue: HashMap<String, Arc<Mutex<Runner>>>,
}

impl Jobs {
	pub fn new() -> Self {
		Jobs {
			queue: HashMap::new(),
		}
	}

	// async fn running_job_id(&self) -> Option<String> {
	// 	for (id, runner) in self.queue.iter() {
	// 		if runner.lock().await.is_running {
	// 			return Some(id.clone());
	// 		}
	// 	}

	// 	None
	// }

	pub async fn enqueue(&mut self, job: Box<dyn Job>, ctx: Context) {
		let runner = Runner::new(job);
		let runner_id = runner.id.clone();

		if self.queue.len() < 2 {
			let runner = Arc::new(Mutex::new(runner));

			Runner::spawn(runner.clone(), ctx).await;

			self.queue.insert(runner_id, runner);
		} else {
			// println!("queue is full");
			// panic!("queue is full");
			// let _ = ctx.emit_client_event("job_queue_full".to_string());
		}
	}

	pub fn dequeue(&mut self, runner_id: String) {
		self.queue.remove(&runner_id);
	}
}
