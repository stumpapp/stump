use serde::{Deserialize, Serialize};

use crate::{
	db::entity::LibraryScanMode,
	job::{Job, JobError, JobTrait, WorkerCtx},
	CoreError,
};

use super::LibraryScanner;

pub const LIBRARY_SCAN_JOB_NAME: &str = "library_scan";
pub const SERIES_SCAN_JOB_NAME: &str = "series_scan";

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
		let scanner = LibraryScanner::new(self.library_path.clone(), ctx);
		let completed_task_count = match self.scan_mode {
			LibraryScanMode::Default => scanner.scan().await,
			LibraryScanMode::None => Err(CoreError::JobInitializationError(
				String::from("Library scan mode is set to NONE"),
			)),
		}?;

		tracing::info!(completed_task_count, "Library scan completed");
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

#[derive(Serialize, Deserialize)]
pub struct SeriesScanJob {
	pub series_path: String,
}

#[async_trait::async_trait]
impl JobTrait for SeriesScanJob {
	fn name(&self) -> &'static str {
		SERIES_SCAN_JOB_NAME
	}

	fn description(&self) -> Option<Box<&str>> {
		Some(Box::new(self.series_path.as_str()))
	}

	async fn run(&mut self, _ctx: WorkerCtx) -> Result<u64, JobError> {
		unimplemented!("Series scan job is not implemented yet")
	}
}

impl SeriesScanJob {
	pub fn new(series_path: String) -> Box<Job<SeriesScanJob>> {
		Job::new(Self { series_path })
	}
}
