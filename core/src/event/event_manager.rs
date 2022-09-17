use std::sync::Arc;

use rocket::tokio::{self, sync::mpsc};

use crate::{config::context::Ctx, job::pool::JobPool};

use super::InternalCoreTask;

pub struct EventManager {
	job_pool: Arc<JobPool>,
}

impl EventManager {
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
