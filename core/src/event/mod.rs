pub mod event_manager;

use serde::{Deserialize, Serialize};

use crate::{
	job::{Job, JobStatus, JobUpdate},
	prisma,
};

#[derive(Debug)]

pub enum ClientRequest {
	QueueJob(Box<dyn Job>),
	GetRunningJob,
	GetQueuedJobs,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum ClientEvent {
	JobStarted(JobUpdate),
	JobProgress(JobUpdate),
	JobComplete(String),
	// FIXME: don't use tuple
	JobFailed((String, String)),
	CreatedMedia(prisma::media::Data),
	CreatedSeries(prisma::series::Data),
}

impl ClientEvent {
	pub fn job_started(
		runner_id: String,
		current_task: u64,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		ClientEvent::JobStarted(JobUpdate {
			runner_id,
			current_task,
			task_count,
			message,
			status: Some(JobStatus::Running),
		})
	}

	pub fn job_progress(
		runner_id: String,
		current_task: u64,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		ClientEvent::JobProgress(JobUpdate {
			runner_id,
			current_task,
			task_count,
			message,
			status: Some(JobStatus::Running),
		})
	}
}
