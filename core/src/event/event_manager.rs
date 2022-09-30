use std::sync::Arc;

use rocket::tokio::{self, sync::mpsc};

use crate::{config::context::Ctx, job::pool::JobPool};

use super::InternalCoreTask;

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
	pub fn new(
		ctx: Ctx,
		mut request_reciever: mpsc::UnboundedReceiver<InternalCoreTask>,
	) -> Arc<Self> {
		let this = Arc::new(Self {
			job_pool: JobPool::new(),
		});

		let this_cpy = this.clone();
		tokio::spawn(async move {
			while let Some(req) = request_reciever.recv().await {
				match req {
					InternalCoreTask::QueueJob(job) => {
						this_cpy
							.clone()
							.job_pool
							.clone()
							.enqueue_job(&ctx, job)
							.await;
					},
					InternalCoreTask::GetJobReports(return_sender) => {
						let job_report =
							this_cpy.clone().job_pool.clone().report(&ctx).await;

						// FIXME: lots...

						// if job_report.is_err() {
						// 	log::error!(
						// 		"TODO: logging isn't enough here, but: {:?}",
						// 		job_report.err()
						// 	);
						// }

						// FIXME: I know, this will break.
						let _ = return_sender.send(job_report.unwrap());
					},
					// TODO: remove this
					#[allow(unreachable_patterns)]
					_ => unimplemented!("I can't do that yet!"),
				}
			}
		});

		this
	}
}
