pub mod library_scan;
pub mod pool;
pub mod runner;

use std::fmt::Debug;

use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
	config::context::Ctx,
	event::ClientEvent,
	prisma::{self},
	types::errors::ApiError,
};

#[derive(Clone, Serialize, Deserialize, Debug, JsonSchema)]
pub enum JobStatus {
	#[serde(rename = "RUNNING")]
	Running,
	#[serde(rename = "QUEUED")]
	Queued,
	#[serde(rename = "COMPLETED")]
	Completed,
	#[serde(rename = "CANCELLED")]
	Cancelled,
	#[serde(rename = "FAILED")]
	Failed,
}

impl std::fmt::Display for JobStatus {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			JobStatus::Running => write!(f, "RUNNING"),
			JobStatus::Queued => write!(f, "QUEUED"),
			JobStatus::Completed => write!(f, "COMPLETED"),
			JobStatus::Cancelled => write!(f, "CANCELLED"),
			JobStatus::Failed => write!(f, "FAILED"),
		}
	}
}

impl From<&str> for JobStatus {
	fn from(s: &str) -> Self {
		match s {
			"RUNNING" => JobStatus::Running,
			"QUEUED" => JobStatus::Queued,
			"COMPLETED" => JobStatus::Completed,
			"CANCELLED" => JobStatus::Cancelled,
			"FAILED" => JobStatus::Failed,
			_ => unreachable!(),
		}
	}
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JobUpdate {
	pub runner_id: String,
	pub current_task: u64,
	pub task_count: u64,
	// TODO: change this to data: Option<T: Serialize> or something...
	pub message: Option<String>,
	pub status: Option<JobStatus>,
}

#[derive(Clone, Serialize, Deserialize, Debug, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct JobReport {
	/// This will actually refer to the job runner id
	pub id: Option<String>,
	//   kind               String
	//   // The extra details of the job, e.g. "/Users/oromei/Documents/Stump/MainLibrary"
	//   details            String?
	//   // The status of the job (i.e. COMPLETED, FAILED, CANCELLED). Running jobs are not persisted to DB.
	status: JobStatus,
	//   // The total number of tasks
	//   taskCount          Int
	//   // The total number of tasks completed (i.e. without error/failure)
	//   completedTaskCount Int
	//   // The time (in seconds) to complete the job
	//   secondsElapsed     Int
	//   // The datetime stamp of when the job completed
	//   completedAt        DateTime @default(now())

	//   logs Log[]
	// The kind of log, e.g. LibraryScan
	pub kind: String,
}

impl From<prisma::job::Data> for JobReport {
	fn from(data: prisma::job::Data) -> Self {
		JobReport {
			id: Some(data.id),
			kind: data.kind,
			status: JobStatus::from(data.status.as_str()),
		}
	}
}

#[async_trait::async_trait]
pub trait Job: Send + Sync {
	fn kind(&self) -> &'static str;
	fn details(&self) -> Option<&'static str>;

	async fn run(&self, runner_id: String, ctx: Ctx) -> Result<(), ApiError>;
}

pub async fn persist_new_job(
	ctx: &Ctx,
	id: String,
	job: &Box<dyn Job>,
) -> Result<crate::prisma::job::Data, ApiError> {
	use crate::prisma::job;

	let db = ctx.get_db();

	Ok(db
		.job()
		.create(
			job::id::set(id),
			job::kind::set(job.kind().to_string()),
			// FIXME: error handling
			vec![
				job::details::set(job.details().map(|d| d.into())),
				// job::task_count::set(task_count.try_into()?),
			],
		)
		.exec()
		.await?)
}

pub async fn persist_job_start(
	ctx: &Ctx,
	id: String,
	task_count: u64,
) -> Result<crate::prisma::job::Data, ApiError> {
	use crate::prisma::job;

	let db = ctx.get_db();

	let job = db
		.job()
		.find_unique(job::id::equals(id.clone()))
		.update(vec![
			job::task_count::set(task_count.try_into()?),
			job::status::set(JobStatus::Running.to_string()),
		])
		.exec()
		.await?;

	if job.is_none() {
		return Err(ApiError::InternalServerError(format!(
			"Error trying to update job with runner ID {}: could not find job.",
			id
		)));
	}

	ctx.emit_client_event(ClientEvent::job_started(
		id.clone(),
		1,
		task_count,
		Some(format!("Job {} started.", id)),
	));

	Ok(job.unwrap())
}

pub async fn persist_job_end(
	ctx: &Ctx,
	id: String,
	completed_task_count: u64,
	elapsed_seconds: u64,
) -> Result<crate::prisma::job::Data, ApiError> {
	use crate::prisma::job;

	let db = ctx.get_db();

	let job = db
		.job()
		.find_unique(job::id::equals(id.clone()))
		.update(vec![
			job::completed_task_count::set(completed_task_count.try_into()?),
			job::seconds_elapsed::set(elapsed_seconds.try_into()?),
			job::status::set(JobStatus::Completed.to_string()),
		])
		.exec()
		.await?;

	if job.is_none() {
		return Err(ApiError::InternalServerError(format!(
			"Error trying to update job with runner ID {}: could not find job.",
			id
		)));
	}

	Ok(job.unwrap())
}
