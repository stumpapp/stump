use std::sync::Arc;

use crate::{event::InternalCoreTask, job::JobManager, Ctx};
use tokio::{self, sync::mpsc};
use tracing::error;

/// The [`EventManager`] struct is responsible for handling internal tasks ([`InternalCoreTask`]).
/// Internal tasks are 'converted' to [`Job`](crate::job::Job)s, which are queued and executed
/// by the [`JobManager`].
pub struct EventManager {
	job_manager: Arc<JobManager>,
}

// TODO: delete this

// TODO: I think event manager can manage it's own Ctx here, and instead of housing all
// of the logic in the `new` function there can be something like `handle_event`.
impl EventManager {
	/// Creates a new instance of [`EventManager`] and returns it wrapped in an [`Arc`].
	/// A thread is spawned to handle the incoming tasks.
	///
	/// ## Example
	/// ```rust
	/// use stump_core::{event::event_manager::EventManager, Ctx, config::StumpConfig};
	/// use tokio::sync::mpsc::unbounded_channel;
	///
	/// #[tokio::main]
	/// async fn main() {
	///    let (sender, reciever) = unbounded_channel();
	///    let config = StumpConfig::debug();
	///    let ctx = Ctx::new(config, sender).await;
	///    let event_manager = EventManager::new(ctx, reciever);
	/// }
	/// ```
	pub fn new(
		ctx: Ctx,
		mut request_reciever: mpsc::UnboundedReceiver<InternalCoreTask>,
	) -> Arc<Self> {
		let job_manager = JobManager::new(ctx.arced());
		let this = Arc::new(Self {
			job_manager: job_manager.arced(),
		});

		let this_cpy = this.clone();
		tokio::spawn(async move {
			while let Some(task) = request_reciever.recv().await {
				this_cpy.clone().handle_task(task).await;
			}
		});

		this
	}

	// TODO: bubble up errors to have single point of reporting...
	async fn handle_task(self: Arc<Self>, task: InternalCoreTask) {
		match task {
			InternalCoreTask::EnqueueJob(job) => {
				self.job_manager
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
				let result = self.job_manager.clone().cancel_job(job_id.clone()).await;

				return_sender
					.send(result)
					.expect("Fatal error: failed to send cancel job result");
			},
			InternalCoreTask::GetJobs(return_sender) => {
				let job_report = self.clone().job_manager.clone().report().await;

				return_sender
					.send(job_report)
					.expect("Fatal error: failed to send job report");
			},
			InternalCoreTask::Shutdown { return_sender } => {
				self.clone().job_manager.clone().shutdown().await;

				// TODO: this is a hack, but I'm not sure how to handle this yet
				// The job manager shutdown just uses another channel to shutdown
				// any running jobs, so the timing is a bit unknown. For now, I'll
				// give it 3 seconds to shutdown before returning the result.
				tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

				return_sender
					.send(())
					.expect("Fatal error: failed to send shutdown result");
			},
		}
	}

	pub fn get_job_manager(&self) -> Arc<JobManager> {
		self.job_manager.clone()
	}
}
