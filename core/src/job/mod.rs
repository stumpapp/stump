pub mod jobs;
pub mod pool;
pub mod runner;

pub use jobs::*;
use utoipa::ToSchema;

use std::{fmt::Debug, num::TryFromIntError};

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	error::{CoreError, CoreResult},
	event::CoreEvent,
	job::runner::RunnerCtx,
	prisma::{self},
	Ctx,
};

#[async_trait::async_trait]
pub trait Job: Send + Sync {
	fn kind(&self) -> &'static str;
	fn details(&self) -> Option<Box<&str>>;

	async fn run(&mut self, ctx: RunnerCtx) -> CoreResult<u64>;
}

pub struct JobWrapper {
	job: Box<dyn Job>,
}

impl JobWrapper {
	pub fn new(job: Box<dyn Job>) -> Self {
		JobWrapper { job }
	}
}

impl JobWrapper {
	async fn run(&mut self, ctx: RunnerCtx) -> CoreResult<()> {
		let runner_id = ctx.runner_id.clone();
		let core_ctx = ctx.core_ctx.clone();

		let job_fn = self.job.run(ctx.clone());
		tokio::pin!(job_fn);
		let start = std::time::Instant::now();

		// Consider splitting progress into two kinds:
		// 1. task complete, iterate a counter, send to client
		// 2. job update, send misc info to client
		// I think this would be useful so that on a failure event,
		// the JobWrapper still has the final progress value to send to the client
		// let mut progress_rx = ctx.progress_tx.subscribe();

		let mut running = true;
		while running {
			tokio::select! {
				// FIXME: I think this caused way too much lag, having this middle layer. Essentially,
				// what I have found is that when I send progress updates to here, instead of directly
				// using `emit_client_event`, the lag would build up and then ONLY send the first and second
				// udpates. That is bad. For now, leaving as commented out so I can wrap up the
				// job cancelling. Will need to revist this, as I liked this pattern.
				// job_progress = progress_rx.recv() => {
				// 	println!("Runner {} has progressed: {:?}", runner_id, job_progress);
				// 	if let Ok(progress) = job_progress {
				// 		core_ctx
				// 			.emit_client_event(CoreEvent::JobProgress(progress));
				// 	} else {
				// 		error!("Unable to send job progress: {:?}", job_progress.err());
				// 	}
				// },
				job_result = &mut job_fn => {
					let duration = start.elapsed();

					running = false;

					if let Err(err) = job_result {
						core_ctx.emit_client_event(CoreEvent::JobFailed {
							runner_id: runner_id.clone(),
							message: err.to_string(),
						});

						return Err(err)
					} else {
						let completed_tasks = job_result.unwrap();
						persist_job_end(&core_ctx, ctx.runner_id.clone(), completed_tasks, duration.as_millis()).await?;
					}

				},
			}
		}

		Ok(())
	}
}

#[derive(Debug, Clone)]
pub enum JobEvent {
	Progress(JobUpdate),
	// Cancelled,
	Completed,
	Failed,
}

#[derive(Clone, Serialize, Deserialize, Debug, Type, ToSchema)]
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

#[derive(Clone, Serialize, Deserialize, Debug, Type)]
pub struct JobUpdate {
	pub runner_id: String,
	// TODO: don't use option. This is a temporary workaround for the Arc issue with
	// batch scan mode.
	pub current_task: Option<u64>,
	pub task_count: u64,
	// TODO: change this to data: Option<T: Serialize> or something...
	pub message: Option<String>,
	pub status: Option<JobStatus>,
}

impl JobUpdate {
	pub fn job_initializing(runner_id: String, message: Option<String>) -> Self {
		JobUpdate {
			runner_id,
			current_task: None,
			task_count: 0,
			message: Some(message.unwrap_or_else(|| "Initializing job...".to_string())),
			status: Some(JobStatus::Running),
		}
	}

	pub fn job_started(
		runner_id: String,
		current_task: u64,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		JobUpdate {
			runner_id,
			current_task: Some(current_task),
			task_count,
			message,
			status: Some(JobStatus::Running),
		}
	}

	pub fn job_progress(
		runner_id: String,
		current_task: Option<u64>,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		JobUpdate {
			runner_id,
			current_task,
			task_count,
			message,
			status: Some(JobStatus::Running),
		}
	}

	// TODO: remove / replace this. semantically, this is not correct. it will be confusing
	// to others. in general, much of these job helpers need to be rethinked.
	pub fn job_finishing(
		runner_id: String,
		current_task: Option<u64>,
		task_count: u64,
		message: Option<String>,
	) -> Self {
		JobUpdate {
			runner_id,
			current_task,
			task_count,
			message: Some(message.unwrap_or_else(|| "Job finished!".to_string())),
			status: Some(JobStatus::Running),
		}
	}
}

#[derive(Clone, Serialize, Deserialize, Debug, Type, ToSchema)]
pub struct JobReport {
	/// This will actually refer to the job runner id
	pub id: Option<String>,
	/// The kind of log, e.g. LibraryScanJob
	pub kind: String,
	/// The extra details of the job, e.g. "/Users/oromei/Documents/Stump/MainLibrary"
	pub details: Option<String>,
	/// The status of the job (i.e. COMPLETED, FAILED, CANCELLED). Running jobs are not persisted to DB.
	status: JobStatus,
	/// The total number of tasks
	task_count: Option<i32>,
	/// The total number of tasks completed (i.e. without error/failure)
	completed_task_count: Option<i32>,
	/// The time (in milliseconds) to complete the job
	ms_elapsed: Option<u64>,
	/// The datetime stamp of when the job completed
	completed_at: Option<String>,
}

impl From<prisma::job::Data> for JobReport {
	fn from(data: prisma::job::Data) -> Self {
		JobReport {
			id: Some(data.id),
			kind: data.kind,
			details: data.details,
			status: JobStatus::from(data.status.as_str()),
			task_count: Some(data.task_count),
			completed_task_count: Some(data.completed_task_count),
			ms_elapsed: Some(data.ms_elapsed as u64),
			completed_at: Some(data.completed_at.to_string()),
		}
	}
}

impl From<&Box<dyn Job>> for JobReport {
	fn from(job: &Box<dyn Job>) -> Self {
		Self {
			id: None,
			kind: job.kind().to_string(),
			details: job.details().map(|d| d.clone().to_string()),
			status: JobStatus::Queued,

			task_count: None,
			completed_task_count: None,
			ms_elapsed: None,
			completed_at: None,
		}
	}
}

pub async fn persist_new_job(
	ctx: &Ctx,
	id: String,
	job: &dyn Job,
) -> CoreResult<crate::prisma::job::Data> {
	use crate::prisma::job;

	let db = ctx.get_db();

	Ok(db
		.job()
		.create(
			id,
			job.kind().to_string(),
			vec![
				job::details::set(job.details().map(|d| d.clone().to_string())),
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
) -> CoreResult<crate::prisma::job::Data> {
	use crate::prisma::job;

	let db = ctx.get_db();

	let job = db
		.job()
		.update(
			job::id::equals(id.clone()),
			vec![
				// TODO: I am clearly using this a lot, make a mapping for it
				job::task_count::set(task_count.try_into().map_err(
					|e: TryFromIntError| CoreError::InternalError(e.to_string()),
				)?),
				job::status::set(JobStatus::Running.to_string()),
			],
		)
		.exec()
		.await?;

	ctx.emit_client_event(CoreEvent::job_started(
		id.clone(),
		0,
		task_count,
		Some(format!("Job {} started.", id)),
	));

	Ok(job)
}

pub async fn persist_job_end(
	ctx: &Ctx,
	id: String,
	completed_task_count: u64,
	ms_elapsed: u128,
) -> CoreResult<crate::prisma::job::Data> {
	use crate::prisma::job;

	let db = ctx.get_db();

	let job = db
		.job()
		.update(
			job::id::equals(id.clone()),
			vec![
				job::completed_task_count::set(completed_task_count.try_into().map_err(
					|e: TryFromIntError| CoreError::InternalError(e.to_string()),
				)?),
				// FIXME: potentially unsafe cast u128 -> u64
				job::ms_elapsed::set(ms_elapsed.try_into().map_err(
					|e: TryFromIntError| CoreError::InternalError(e.to_string()),
				)?),
				job::status::set(JobStatus::Completed.to_string()),
			],
		)
		.exec()
		.await?;

	Ok(job)
}

pub async fn persist_job_cancelled(
	ctx: &Ctx,
	id: String,
) -> CoreResult<crate::prisma::job::Data> {
	use crate::prisma::job;

	let db = ctx.get_db();

	let job = db
		.job()
		.update(
			job::id::equals(id.clone()),
			vec![job::status::set(JobStatus::Cancelled.to_string())],
		)
		.exec()
		.await?;

	Ok(job)
}
