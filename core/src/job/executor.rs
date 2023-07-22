use super::{
	utils::persist_job_end, JobDetail, JobError, JobStatus, JobTrait, WorkerCtx,
};
use tracing::{error, trace};
use uuid::Uuid;

#[async_trait::async_trait]
pub trait JobExecutorTrait: Send + Sync {
	fn name(&self) -> &'static str;
	fn description(&self) -> Option<Box<&str>>;
	fn detail(&self) -> &Option<JobDetail>;
	fn detail_mut(&mut self) -> &mut Option<JobDetail>;
	async fn execute(&mut self, ctx: WorkerCtx) -> Result<(), JobError>;
	async fn finish(
		&self,
		result: Result<(), JobError>,
		ctx: WorkerCtx,
	) -> Result<(), JobError>;
}

pub struct Job<InnerJob: JobTrait> {
	detail: Option<JobDetail>,
	// state: JobState<InnerJob>,
	inner_job: InnerJob,
}

impl<InnerJob: JobTrait> Job<InnerJob> {
	pub fn new(inner_job: InnerJob) -> Box<Self> {
		Box::new(Self {
			detail: Some(JobDetail::new(
				Uuid::new_v4().to_string(),
				inner_job.name().to_string(),
				inner_job.description().map(|s| s.to_string()),
			)),
			// state: JobState::<InnerJob>::default(),
			inner_job,
		})
	}
}

#[async_trait::async_trait]
impl<InnerJob: JobTrait> JobExecutorTrait for Job<InnerJob> {
	fn detail(&self) -> &Option<JobDetail> {
		&self.detail
	}

	fn detail_mut(&mut self) -> &mut Option<JobDetail> {
		&mut self.detail
	}

	fn name(&self) -> &'static str {
		self.inner_job.name()
	}

	fn description(&self) -> Option<Box<&str>> {
		self.inner_job.description()
	}

	async fn execute(&mut self, ctx: WorkerCtx) -> Result<(), JobError> {
		let mut shutdown_rx = ctx.shutdown_rx();
		let shutdown_rx_fut = shutdown_rx.recv();
		tokio::pin!(shutdown_rx_fut);

		let start = std::time::Instant::now();

		let mut running = true;
		while running {
			tokio::select! {
				job_result = self.inner_job.run(ctx.clone(), /*&mut self.state*/) => {
					running = false;

					let duration = start.elapsed().as_millis() as u64;
					let persist_result = match job_result {
						Ok(completed_count) => {
							persist_job_end(
								&ctx.core_ctx,
								ctx.job_id.clone(),
								JobStatus::Completed,
								duration,
								Some(completed_count),
							)
							.await
						},
						Err(err) => {
							error!(?err, "Job failed!");
							persist_job_end(
								&ctx.core_ctx,
								ctx.job_id.clone(),
								JobStatus::Failed,
								duration,
								None,
							)
							.await
						},
					};
					println!("Persist result: {:?}", persist_result);
				}
				// TODO: I think this might be wrong for pausing, in that even if the signal is
				// meant to pause, it will kill the future above? Unless I pin it maybe?
				shutdown_result = &mut shutdown_rx_fut => {
					let duration = start.elapsed().as_millis() as u64;
					if let Ok(_signal_type) = shutdown_result {
						// TODO: this is where we would save state once jobs are stateful some day
						// match signal_type {
						// 	JobManagerShutdownSignal::Worker(id) if &id == ctx.job_id()  => {
						// 		let state = serde_json::to_vec(&self.state).expect("Failed to serialize job state");
						// 		return Err(JobError::Paused(state));
						// 	}
						// 	JobManagerShutdownSignal::All => {
						// 		return Err(JobError::Cancelled);
						// 	}
						// 	_ => {}
						// }
						// unimplemented!()
						let persist_result = persist_job_end(
							&ctx.core_ctx,
							ctx.job_id.clone(),
							JobStatus::Failed,
							duration,
							None,
						)
						.await;

						if let Err(err) = persist_result {
							error!(?err, "Failed to persist job end");
						}

						return Err(JobError::Cancelled);
					} else if let Err(err) = shutdown_result {
						error!(?err, "Failed to receive shutdown signal");

						let persist_result = persist_job_end(
							&ctx.core_ctx,
							ctx.job_id.clone(),
							JobStatus::Failed,
							duration,
							None,
						)
						.await;

						if let Err(err) = persist_result {
							error!(?err, "Failed to persist job end");
						}

						return Err(JobError::Unknown(err.to_string()));
					}
				}
			}
		}

		Ok(())
	}

	// TODO: Once Stump supports pausing and resuming jobs, this will need to be properly implemented.
	async fn finish(
		&self,
		job_result: Result<(), JobError>,
		ctx: WorkerCtx,
	) -> Result<(), JobError> {
		trace!(?job_result, "Job finished!");
		// let resolved_state = if let Err(e) = result {
		// 	match e {
		// 		JobError::Paused(state) => state,
		// 		_ => serde_json::to_vec(&self.state)
		// 			.expect("Failed to serialize job state"),
		// 	}
		// } else {
		// 	serde_json::to_vec(&self.state).expect("Failed to serialize job state")
		// };

		// let _ =
		// 	persist_job_state(ctx.core_ctx.clone(), resolved_state, ctx.job_id.clone())
		// 		.await;

		ctx.emit_job_complete();

		Ok(())
	}
}
