mod executor;
mod job_manager;
pub(crate) mod utils;
mod worker;

pub use executor::{Job, JobExecutorTrait};
pub use job_manager::{
	JobManager, JobManagerError, JobManagerResult, JobManagerShutdownSignal,
};
use prisma_client_rust::QueryError;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;
pub use worker::{Worker, WorkerCtx};

use crate::{filesystem::FileError, prisma, CoreError};

#[derive(Clone, Debug)]
pub enum JobError {
	// Paused(Vec<u8>),
	Cancelled,
	SpawnFailed,
	// InvalidState(String),
	InvalidJob(String),
	Unknown(String),
}

impl From<CoreError> for JobError {
	fn from(err: CoreError) -> Self {
		match err {
			CoreError::JobInitializationError(msg) => JobError::InvalidJob(msg),
			_ => JobError::Unknown(err.to_string()),
		}
	}
}

impl From<QueryError> for JobError {
	fn from(err: QueryError) -> Self {
		JobError::Unknown(err.to_string())
	}
}

impl From<FileError> for JobError {
	fn from(err: FileError) -> Self {
		JobError::Unknown(err.to_string())
	}
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, Type, ToSchema)]
pub enum JobStatus {
	#[serde(rename = "RUNNING")]
	Running,
	// #[serde(rename = "PAUSED")]
	// Paused,
	#[serde(rename = "COMPLETED")]
	Completed,
	#[serde(rename = "CANCELLED")]
	Cancelled,
	#[serde(rename = "FAILED")]
	Failed,
	#[default]
	Queued,
}

impl std::fmt::Display for JobStatus {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			JobStatus::Running => write!(f, "RUNNING"),
			// JobStatus::Paused => write!(f, "PAUSED"),
			JobStatus::Completed => write!(f, "COMPLETED"),
			JobStatus::Cancelled => write!(f, "CANCELLED"),
			JobStatus::Failed => write!(f, "FAILED"),
			JobStatus::Queued => write!(f, "QUEUED"),
		}
	}
}

impl From<&str> for JobStatus {
	fn from(s: &str) -> Self {
		match s {
			"RUNNING" => JobStatus::Running,
			// "PAUSED" => JobStatus::Paused,
			"COMPLETED" => JobStatus::Completed,
			"CANCELLED" => JobStatus::Cancelled,
			"FAILED" => JobStatus::Failed,
			"QUEUED" => JobStatus::Queued,
			_ => unreachable!(),
		}
	}
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, Type, ToSchema)]
pub struct JobDetail {
	/// The ID of the job
	pub id: String,
	/// The name of job, e.g. LibraryScanJob
	pub name: String,
	/// The extra details of the job, e.g. "/Users/oromei/Documents/Stump/MainLibrary"
	pub description: Option<String>,
	/// The status of the job. e.g. Running, Paused, Completed, Cancelled, Failed, Queued
	pub status: JobStatus,
	/// The total number of tasks
	pub task_count: Option<i32>,
	/// The total number of tasks completed (i.e. without error/failure)
	pub completed_task_count: Option<i32>,
	/// The time (in milliseconds) to complete the job
	pub ms_elapsed: Option<u64>,
	/// The datetime stamp of when the job completed
	pub completed_at: Option<String>,
}

impl JobDetail {
	pub fn new(id: String, name: String, description: Option<String>) -> Self {
		Self {
			id,
			name,
			description,
			status: JobStatus::Queued,
			task_count: None,
			completed_task_count: None,
			ms_elapsed: None,
			completed_at: None,
		}
	}
}

impl From<prisma::job::Data> for JobDetail {
	fn from(data: prisma::job::Data) -> Self {
		JobDetail {
			id: data.id,
			name: data.name,
			description: data.description,
			status: JobStatus::from(data.status.as_str()),
			task_count: Some(data.task_count),
			completed_task_count: Some(data.completed_task_count),
			ms_elapsed: Some(data.ms_elapsed as u64),
			completed_at: Some(data.completed_at.to_string()),
		}
	}
}

// TODO: change this!
#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct JobUpdate {
	pub job_id: String,
	pub current_task: Option<u64>,
	pub task_count: u64,
	pub message: Option<String>,
	pub status: Option<JobStatus>,
}

impl JobUpdate {
	pub fn started(job_id: String, task_count: u64, message: Option<String>) -> Self {
		Self {
			job_id,
			current_task: Some(0),
			task_count,
			message,
			status: Some(JobStatus::Running),
		}
	}

	pub fn tick(
		job_id: String,
		current_task: u64,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		Self {
			job_id,
			current_task: Some(current_task),
			task_count,
			message,
			status: Some(JobStatus::Running),
		}
	}
}

// #[derive(Serialize, Deserialize)]
// pub struct JobState<J: JobTrait> {
// 	pub tasks: VecDeque<J::Task>,
// 	pub current_task: usize,
// 	pub ms_elapsed: u64,
// }

// impl<J: JobTrait> Default for JobState<J> {
// 	fn default() -> Self {
// 		Self {
// 			tasks: VecDeque::new(),
// 			current_task: 0,
// 			ms_elapsed: 0,
// 		}
// 	}
// }

#[async_trait::async_trait]
pub trait JobTrait: Send + Sync + Sized {
	// state will be serialized and stored in DB on pause and/or any completed state
	// (including failure completion). So it needs to be serializable and deserializable.
	// type Task: Serialize + DeserializeOwned + Send + Sync;

	fn name(&self) -> &'static str;
	fn description(&self) -> Option<Box<&str>>;
	// TODO: once jobs are stateful, the run return does not need to include the completed count
	async fn run(
		&mut self,
		ctx: WorkerCtx,
		// state: &mut JobState<Self>,
	) -> Result<u64, JobError>;
}
