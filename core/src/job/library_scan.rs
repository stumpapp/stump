use super::{log_job_end, Job, JobStatus};

use crate::{
	config::context::Ctx, fs::scanner::library::scan_sync as scan,
	types::errors::ApiError,
};

#[derive(Debug)]
pub struct LibraryScannerJob {
	pub path: String,
}

#[async_trait::async_trait]
impl Job for LibraryScannerJob {
	async fn run(&self, runner_id: String, ctx: Ctx) -> Result<(), ApiError> {
		// TODO: I am unsure if I want to have the scan return completed_task, or if I
		// should just move the time tracking and job logging to the scan entirely...
		let start = std::time::Instant::now();
		let completed_tasks =
			scan(ctx.get_ctx(), self.path.clone(), runner_id.clone()).await?;
		let duration = start.elapsed();

		log::info!(
			"Finished library scan in {}.{:03} seconds",
			duration.as_secs(),
			duration.subsec_millis()
		);

		log_job_end(
			&ctx,
			runner_id,
			completed_tasks,
			duration.as_secs(),
			JobStatus::Completed,
		)
		.await?;

		Ok(())
	}
}
