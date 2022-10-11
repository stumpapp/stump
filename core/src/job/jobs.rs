use super::{Job, RunnerCtx};
use crate::{
	fs::scanner::library_scanner::scan,
	job::JobUpdate,
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

	async fn run(&mut self, ctx: RunnerCtx) -> CoreResult<u64> {
		let runner_id = ctx.runner_id.clone();

		let result = scan(ctx, self.path.clone(), runner_id, self.scan_mode).await?;
		info!(
			"Finished {:?} library scan at {:?}",
			self.scan_mode,
			self.path.clone(),
		);
		// persist_job_end(&ctx, runner_id, completed_tasks, duration.as_millis()).await?;

		Ok(result)
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

	async fn run(&mut self, ctx: RunnerCtx) -> CoreResult<u64> {
		// tick every 5 seconds
		let tick_interval = self.interval.unwrap_or(5);
		let max_ticks = self.max_ticks.unwrap_or(20);

		let mut interval =
			tokio::time::interval(std::time::Duration::from_secs(tick_interval));

		for i in 0..max_ticks {
			interval.tick().await;
			// println!("Test job tick {}", i);
			ctx.progress(JobUpdate::job_progress(
				ctx.runner_id.clone(),
				Some(i),
				max_ticks * tick_interval,
				Some(format!("Test job tick {}", i)),
			));
		}

		Ok(max_ticks * tick_interval)
	}
}
