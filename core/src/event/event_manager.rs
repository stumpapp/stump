use std::sync::Arc;

use rocket::tokio::{self, sync::mpsc};

use crate::{config::context::Ctx, job::pool::JobPool};

use super::ClientRequest;

pub struct EventManager {
	job_pool: Arc<JobPool>,
}

impl EventManager {
	pub fn new(
		ctx: Ctx,
		mut request_reciever: mpsc::UnboundedReceiver<ClientRequest>,
	) -> Arc<Self> {
		let this = Arc::new(Self {
			job_pool: JobPool::new(),
		});

		let this_cpy = this.clone();
		tokio::spawn(async move {
			while let Some(req) = request_reciever.recv().await {
				match req {
					ClientRequest::QueueJob(job) => {
						this_cpy
							.clone()
							.job_pool
							.clone()
							.enqueue_job(&ctx, job)
							.await;
					},
					_ => unimplemented!("I can't do that yet!"),
				}
			}
		});

		this
	}
}
