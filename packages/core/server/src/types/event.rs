use rocket::tokio::sync::oneshot;
use serde::{Deserialize, Serialize};

use crate::job::Job;

use super::errors::ApiError;

#[derive(Debug)]
pub enum InternalEvent {
	QueueJob(Box<dyn Job>),
	JobComplete(String),
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

#[derive(Debug)]
pub struct TaskResponder<D, R = Result<TaskResponse, ApiError>> {
	pub task: D,
	pub return_sender: oneshot::Sender<R>,
}
