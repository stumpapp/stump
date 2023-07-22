use serde::{Deserialize, Serialize};
use tracing::info;

use crate::{
	db::entity::LibraryScanMode,
	job::{Job, JobError, JobTrait, WorkerCtx},
	CoreError,
};

use super::{batch_scanner, sync_scanner};

pub const LIBRARY_SCAN_JOB_NAME: &str = "library_scan";

#[derive(Serialize, Deserialize)]
pub struct LibraryScanJob {
	pub library_path: String,
	pub scan_mode: LibraryScanMode,
}

#[async_trait::async_trait]
impl JobTrait for LibraryScanJob {
	fn name(&self) -> &'static str {
		LIBRARY_SCAN_JOB_NAME
	}

	fn description(&self) -> Option<Box<&str>> {
		Some(Box::new(self.library_path.as_str()))
	}

	async fn run(&mut self, ctx: WorkerCtx) -> Result<u64, JobError> {
		let completed_task_count = match self.scan_mode {
			LibraryScanMode::Batched => {
				batch_scanner::scan_library(ctx, self.library_path.clone()).await
			},
			LibraryScanMode::Sync => {
				sync_scanner::scan_library(ctx, self.library_path.clone()).await
			},
			LibraryScanMode::None => Err(CoreError::JobInitializationError(
				String::from("Library scan mode is set to NONE"),
			)),
		}?;

		info!(completed_task_count, "Library scan completed");
		Ok(completed_task_count)
	}
}

impl LibraryScanJob {
	pub fn new(library_path: String, mode: LibraryScanMode) -> Box<Job<LibraryScanJob>> {
		Job::new(Self {
			library_path,
			scan_mode: mode,
		})
	}
}
