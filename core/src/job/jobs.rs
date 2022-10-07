use super::{Job, RunnerCtx};
use crate::{
	fs::scanner::library_scanner::scan,
	types::{models::library::LibraryScanMode, CoreResult},
};
use tracing::{debug, info};

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

	async fn run(&mut self, ctx: RunnerCtx) -> CoreResult<()> {
		let runner_id = ctx.runner_id.clone();

		let start = std::time::Instant::now();
		let result = scan(ctx, self.path.clone(), runner_id, self.scan_mode).await?;
		let duration = start.elapsed();

		info!(
			"Finished {:?} library scan at {:?}",
			self.scan_mode,
			self.path.clone(),
		);
		info!(
			"{} files processed in {}.{:03} seconds.",
			result,
			duration.as_secs(),
			duration.subsec_millis()
		);

		// persist_job_end(&ctx, runner_id, completed_tasks, duration.as_millis()).await?;

		Ok(())
	}
}

// #[derive(Debug)]
// pub struct AllLibrariesScanJob {
// 	pub scan_mode: LibraryScanMode,
// }

// #[async_trait::async_trait]
// impl Job for AllLibrariesScanJob {
// 	fn kind(&self) -> &'static str {
// 		"AllLibrariesScanJob"
// 	}

// 	fn details(&self) -> Option<Box<&str>> {
// 		todo!()
// 	}

// 	async fn run(&self, _runner_id: String, _ctx: Ctx) -> CoreResult<()> {
// 		todo!()
// 	}
// }

#[derive(Debug)]
pub struct TestJob {
	pub interval: Option<u64>,
	pub max_ticks: Option<u64>,
}

#[async_trait::async_trait]
impl Job for TestJob {
	fn kind(&self) -> &'static str {
		"TestJob"
	}

	fn details(&self) -> Option<Box<&str>> {
		None
	}

	async fn run(&mut self, _job_ctx: RunnerCtx) -> CoreResult<()> {
		// tokio::time::sleep(std::time::Duration::from_secs(self.duration_in_sec)).await;

		// tick every 5 seconds
		let tick_interval = self.interval.unwrap_or(5);
		let max_ticks = self.max_ticks.unwrap_or(20);

		let mut interval =
			tokio::time::interval(std::time::Duration::from_secs(tick_interval));

		for i in 0..max_ticks {
			interval.tick().await;
			debug!("Test job tick {}", i);
		}

		Ok(())
	}
}
