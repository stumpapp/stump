use super::{persist_job_end, Job};
use crate::{
	config::context::Ctx,
	fs::scanner::library::scan_batch,
	fs::scanner::library::scan_sync,
	types::{models::library::LibraryScanMode, CoreResult},
};
use tracing::info;

#[derive(Debug)]
pub struct LibraryScanJob {
	pub path: String,
	pub scan_mode: LibraryScanMode,
}

#[async_trait::async_trait]
impl Job for LibraryScanJob {
	fn kind(&self) -> &'static str {
		"LibraryScanJob"
	}

	fn details(&self) -> Option<Box<&str>> {
		Some(Box::new(self.path.as_str()))
	}

	async fn run(&self, runner_id: String, ctx: Ctx) -> CoreResult<()> {
		let start = std::time::Instant::now();
		let completed_tasks = match self.scan_mode {
			LibraryScanMode::Sync => scan_sync(ctx.get_ctx(), self.path.clone(), runner_id.clone()).await?,
			LibraryScanMode::Batched => scan_batch(ctx.get_ctx(), self.path.clone(), runner_id.clone()).await?,
			_ => unreachable!("If a library scan job was started with the scan mode of NONE, it should not have been started."),
		};
		let duration = start.elapsed();

		info!(
			"Finished {:?} library scan in {}.{:03} seconds. {} files processed.",
			self.scan_mode,
			duration.as_secs(),
			duration.subsec_millis(),
			completed_tasks
		);

		persist_job_end(&ctx, runner_id, completed_tasks, duration.as_millis()).await?;

		Ok(())
	}
}

#[derive(Debug)]
pub struct AllLibrariesScanJob {
	pub scan_mode: LibraryScanMode,
}

#[async_trait::async_trait]
impl Job for AllLibrariesScanJob {
	fn kind(&self) -> &'static str {
		"AllLibrariesScanJob"
	}

	fn details(&self) -> Option<Box<&str>> {
		todo!()
	}

	async fn run(&self, _runner_id: String, _ctx: Ctx) -> CoreResult<()> {
		todo!()
	}
}
