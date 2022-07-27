use super::Job;

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
		let start = std::time::Instant::now();
		scan(ctx, self.path.clone(), runner_id.clone()).await?;
		let duration = start.elapsed();

		log::info!(
			"Finished library scan in {}.{:03} seconds",
			duration.as_secs(),
			duration.subsec_millis()
		);

		Ok(())
	}
}
