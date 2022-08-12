use super::{persist_job_end, Job};

use crate::{
	config::context::Ctx, fs::scanner::library::scan_sync as scan,
	types::errors::ApiError,
};

#[derive(Debug)]
pub struct LibraryScanJob {
	pub path: String,
}

#[async_trait::async_trait]
impl Job for LibraryScanJob {
	fn kind(&self) -> &'static str {
		"LibraryScanJob"
	}

	fn details(&self) -> Option<Box<&str>> {
		Some(Box::new(self.path.as_str()))
	}

	async fn run(&self, runner_id: String, ctx: Ctx) -> Result<(), ApiError> {
		// TODO: I am unsure if I want to have the scan return completed_task, or if I
		// should just move the time tracking and job logging to the scan entirely...
		let start = std::time::Instant::now();
		let completed_tasks =
			scan(ctx.get_ctx(), self.path.clone(), runner_id.clone()).await?;
		let duration = start.elapsed();

		log::info!(
			"Finished library scan in {}.{:03} seconds. {} files processed.",
			duration.as_secs(),
			duration.subsec_millis(),
			completed_tasks
		);

		persist_job_end(&ctx, runner_id, completed_tasks, duration.as_secs()).await?;

		Ok(())
	}
}

#[derive(Debug)]
pub struct AllLibrariesScanJob;

#[async_trait::async_trait]
impl Job for AllLibrariesScanJob {
	fn kind(&self) -> &'static str {
		"AllLibrariesScanJob"
	}

	fn details(&self) -> Option<Box<&str>> {
		todo!()
	}

	async fn run(&self, _runner_id: String, _ctx: Ctx) -> Result<(), ApiError> {
		todo!()
	}
}
