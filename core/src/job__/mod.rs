mod error;
mod manager;
mod worker;

pub use manager::{JobManager, JobManagerCommand};

use worker::WorkerContext;

#[async_trait::async_trait]
pub trait StatefulJob: Send {
	/// The name of the job being implemented.
	fn name(&self) -> &'static str;

	/// Load the initial state of the job before beginning work. This function should
	/// be used both to set up default initial state and to retrieve persisted state
	/// from the database.
	async fn load_state(&mut self, ctx: &WorkerContext);

	/// Save the current state of the job to the database so that it can be retrieved
	/// later.
	async fn save_state(&self, ctx: &WorkerContext);

	/// This function dictates how an increment of work is to be performed by the
	/// job. It should implement the smallest portion of work that can be iterated
	/// continuously until the job is complete.
	async fn do_work(&mut self, ctx: &WorkerContext);

	/// Returns the current progress of the job toward completion as an [f64] between
	/// 0 and 1.
	fn get_progress(&self) -> f64;

	/// Returns `true` if progress indicates that the job has finished.
	fn is_finished(&self) -> bool {
		self.get_progress() >= 1.0
	}
}

impl std::fmt::Debug for dyn StatefulJob {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(f, "Statefuljob{{{}}}", self.get_progress())
	}
}

#[derive(Debug)]
struct CountToNumber {
	current_number: u32,
	max_number: u32,
}

#[async_trait::async_trait]
impl StatefulJob for CountToNumber {
	fn name(&self) -> &'static str {
		"Count to ten"
	}

	async fn load_state(&mut self, ctx: &WorkerContext) {
		todo!()
	}

	async fn save_state(&self, ctx: &WorkerContext) {
		todo!()
	}

	async fn do_work(&mut self, ctx: &WorkerContext) {
		if !self.is_finished() {
			self.current_number += 1;
		}
	}

	fn get_progress(&self) -> f64 {
		self.current_number as f64 / self.max_number as f64
	}
}

impl CountToNumber {
	pub fn new(max_number: u32) -> Self {
		Self {
			current_number: 0,
			max_number,
		}
	}
}
