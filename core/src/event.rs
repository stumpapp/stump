use serde::{Deserialize, Serialize};
use specta::Type;

use crate::job::JobUpdate;

/// An event that is emitted by the core and consumed by a client
#[derive(Clone, Serialize, Deserialize, Debug, Type)]
#[serde(tag = "__typename")]
pub enum CoreEvent {
	JobUpdate(JobUpdate),
	// JobProgress(JobUpdate),
	// JobComplete(String),
	// JobFailed {
	// 	job_id: String,
	// 	message: String,
	// },
	// CreateOrUpdateMedia {
	// 	id: String,
	// 	series_id: String,
	// 	library_id: String,
	// },
	// CreatedManyMedia {
	// 	count: u64,
	// 	library_id: String,
	// },
	// CreatedSeries {
	// 	id: String,
	// 	library_id: String,
	// },
	// CreatedSeriesBatch {
	// 	count: u64,
	// 	library_id: String,
	// },
	// SeriesScanComplete {
	// 	id: String,
	// },
	// GeneratedThumbnailBatch(u64),
}

// impl CoreEvent {
// 	pub fn job_started(
// 		job_id: String,
// 		current_task: u64,
// 		task_count: u64,
// 		message: Option<String>,
// 	) -> Self {
// 		CoreEvent::JobStarted(JobUpdate {
// 			job_id,
// 			current_task: Some(current_task),
// 			task_count,
// 			message,
// 			status: Some(JobStatus::Running),
// 		})
// 	}

// 	pub fn job_progress(
// 		job_id: String,
// 		current_task: Option<u64>,
// 		task_count: u64,
// 		message: Option<String>,
// 	) -> Self {
// 		CoreEvent::JobProgress(JobUpdate {
// 			job_id,
// 			current_task,
// 			task_count,
// 			message,
// 			status: Some(JobStatus::Running),
// 		})
// 	}
// }
