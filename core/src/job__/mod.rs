mod error;
mod manager;
pub(crate) mod worker;

pub use manager::{JobManager, JobManagerCommand};

use worker::WorkerContext;

#[async_trait::async_trait]
pub trait StatefulJob: Send {
	/// The name of the job being implemented.
	fn name(&self) -> &'static str;

	/// Load the initial state of the job before beginning work. This function should
	/// be implemented both to set up default initial state and to retrieve persisted
	///  state from the database.
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
	///
	/// This function must be implemented so that it can evaluate at any time during
	/// the lifetime of the job. This means that the function should handle cases
	/// where it is called before initialization has occurred. In such cases, it should
	/// likely return `0.0` (but really any value `< 1.0` if appropriate). 1.0 indicates
	/// that the job has finished. This function should never return a value `> 1.0`
	fn get_progress(&self) -> f64;

	/// Returns `true` if `self.get_progress` indicates that the job has finished.
	fn is_finished(&self) -> bool {
		self.get_progress() >= 1.0
	}
}

impl std::fmt::Debug for dyn StatefulJob {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(
			f,
			"StatefulJob{{name: {}, progress: {}}}",
			self.name(),
			self.get_progress()
		)
	}
}
