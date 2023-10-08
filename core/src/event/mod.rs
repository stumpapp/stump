pub mod event_manager;

use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::oneshot;

use crate::job::{JobDetail, JobExecutorTrait, JobManagerResult, JobStatus, JobUpdate};

pub enum InternalCoreTask {
	EnqueueJob(Box<dyn JobExecutorTrait>),
	GetJobs(oneshot::Sender<JobManagerResult<Vec<JobDetail>>>),
	CancelJob {
		job_id: String,
		return_sender: oneshot::Sender<JobManagerResult<()>>,
	},
	Shutdown {
		return_sender: oneshot::Sender<()>,
	},
}

pub enum ClientResponse {
	GetJobDetails(Vec<JobDetail>),
}

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
#[serde(tag = "key", content = "data")]
pub enum CoreEvent {
	JobStarted(JobUpdate),
	JobProgress(JobUpdate),
	JobComplete(String),
	JobFailed {
		job_id: String,
		message: String,
	},
	CreateEntityFailed {
		job_id: Option<String>,
		path: String,
		message: String,
	},
	CreateOrUpdateMedia {
		id: String,
		series_id: String,
		library_id: String,
	},
	CreatedManyMedia {
		count: u64,
		library_id: String,
	},
	CreatedSeries {
		id: String,
		library_id: String,
	},
	CreatedSeriesBatch {
		count: u64,
		library_id: String,
	},
	SeriesScanComplete {
		id: String,
	},
	GeneratedThumbnailBatch(u64),
}

impl CoreEvent {
	pub fn job_started(
		job_id: String,
		current_task: u64,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		CoreEvent::JobStarted(JobUpdate {
			job_id,
			current_task: Some(current_task),
			task_count,
			message,
			status: Some(JobStatus::Running),
		})
	}

	pub fn job_progress(
		job_id: String,
		current_task: Option<u64>,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		CoreEvent::JobProgress(JobUpdate {
			job_id,
			current_task,
			task_count,
			message,
			status: Some(JobStatus::Running),
		})
	}
}
