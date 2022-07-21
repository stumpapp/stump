use rocket::tokio::sync::oneshot;
use serde::{Deserialize, Serialize};

use crate::{
	job::{Job, JobStatus, JobUpdate},
	prisma,
};

use super::errors::ApiError;

#[derive(Debug)]
pub enum InternalEvent {
	QueueJob(Box<dyn Job>),
	JobComplete(String),
	JobFailed(String, ApiError),
}

#[derive(Serialize, Deserialize, Debug)]
pub enum InternalTask {
	GetRunningJob,
	GetQueuedJobs,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum TaskResponse {
	GetRunningJob(String),
	GetQueuedJobs(String),
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub enum ClientEvent {
	JobStarted(JobUpdate),
	JobProgress(JobUpdate),
	JobComplete(String),
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

#[derive(Debug)]
pub struct TaskResponder<D, R = Result<TaskResponse, ApiError>> {
	pub task: D,
	pub return_sender: oneshot::Sender<R>,
}
