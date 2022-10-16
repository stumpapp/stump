use std::sync::Arc;

use crate::{config::context::Ctx, event::InternalCoreTask, job::pool::JobPool};
use tokio::{self, sync::mpsc};
use tracing::error;

/// The [`EventManager`] struct is responsible for handling internal tasks ([`InternalCoreTask`]).
/// Internal tasks are 'converted' to [`Job`](crate::job::Job)s, which are queued and executed
/// by the [`JobPool`].
pub struct EventManager {
	job_pool: Arc<JobPool>,
}

// TODO: I think event manager can manage it's own Ctx here, and instead of housing all
// of the logic in the `new` function there can be something like `handle_event`.
impl EventManager {
	/// Creates a new instance of [`EventManager`] and returns it wrapped in an [`Arc`].
	/// A thread is spawned to handle the incoming tasks.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::{event::event_manager::EventManager, config::Ctx};
	/// use tokio::sync::mpsc::unbounded_channel;
	///
	/// #[tokio::main]
	/// async fn main() {
	///    let (sender, reciever) = unbounded_channel();
	///    let ctx = Ctx::new(sender).await;
	///    let event_manager = EventManager::new(ctx, reciever);
	/// }
	/// ```
	pub fn new(
		ctx: Ctx,
		mut request_reciever: mpsc::UnboundedReceiver<InternalCoreTask>,
	) -> Arc<Self> {
		let job_pool = JobPool::new(ctx);
		let this = Arc::new(Self {
			job_pool: job_pool.arced(),
		});

		let this_cpy = this.clone();
		tokio::spawn(async move {
			while let Some(task) = request_reciever.recv().await {
				this_cpy.clone().handle_task(task).await;
			}
		});

		this
	}

	async fn handle_task(self: Arc<Self>, task: InternalCoreTask) {
		match task {
			InternalCoreTask::QueueJob(job) => {
				self.job_pool
					.clone()
					.enqueue_job(job)
					.await
					.unwrap_or_else(|e| {
						error!("Failed to enqueue job: {}", e);
					});
			},
			InternalCoreTask::CancelJob {
				job_id,
				return_sender,
			} => {
				let result = self.job_pool.clone().cancel_job(job_id.clone()).await;

				return_sender
					.send(result)
					.expect("Fatal error: failed to send cancel job result");
			},
			InternalCoreTask::GetJobReports(return_sender) => {
				let job_report = self.clone().job_pool.clone().report().await;

				return_sender
					.send(job_report)
					.expect("Fatal error: failed to send job report");
			},
		}
	}
}
