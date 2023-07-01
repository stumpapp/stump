pub mod event_manager;

use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::oneshot;

use crate::{
	db::entity::Media,
	job::{JobDetail, JobExecutorTrait, JobManagerResult, JobStatus, JobUpdate},
	prisma, CoreResult,
};

pub enum InternalCoreTask {
	EnqueueJob(Box<dyn JobExecutorTrait>),
	GetJobs(oneshot::Sender<CoreResult<Vec<JobDetail>>>),
	CancelJob {
		job_id: String,
		return_sender: oneshot::Sender<JobManagerResult<()>>,
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
	// TODO: change from string...
	JobComplete(String),
	JobFailed {
		runner_id: String,
		message: String,
	},
	CreateEntityFailed {
		runner_id: Option<String>,
		path: String,
		message: String,
	},
	CreatedMedia(Box<Media>),
	// TODO: not sure if I should send the number of insertions or the insertions themselves.
	// cloning the vector is potentially expensive.
	CreatedMediaBatch(u64),
	CreatedSeries(prisma::series::Data),
	// TODO: not sure if I should send the number of insertions or the insertions themselves.
	// cloning the vector is potentially expensive.
	CreatedSeriesBatch(u64),
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
