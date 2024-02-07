use std::{collections::VecDeque, fmt::Debug, sync::Arc, time::Duration};

use prisma_client_rust::chrono::{DateTime, Utc};
use serde::{de, Deserialize, Serialize};

mod controller;
pub mod error;
mod manager;
mod progress;
mod scheduler;
mod task;
mod worker;

use error::JobError;
pub use progress::*;
pub use scheduler::JobScheduler;
use specta::Type;
pub use task::JobTaskOutput;
use task::{job_task_handler, JobTaskHandlerOutput};
use utoipa::ToSchema;
pub use worker::*;

pub use controller::*;
pub use manager::*;
use tokio::spawn;
use uuid::Uuid;

use crate::{
	db::entity::LogLevel,
	prisma::{job, log},
};

#[derive(
	Clone, Debug, Default, Serialize, Deserialize, PartialEq, Eq, Type, ToSchema,
)]
pub enum JobStatus {
	#[serde(rename = "RUNNING")]
	Running,
	#[serde(rename = "PAUSED")]
	Paused,
	#[serde(rename = "COMPLETED")]
	Completed,
	#[serde(rename = "CANCELLED")]
	Cancelled,
	#[serde(rename = "FAILED")]
	Failed,
	#[default]
	#[serde(rename = "QUEUED")]
	Queued,
}

impl JobStatus {
	pub fn is_resolved(&self) -> bool {
		matches!(
			self,
			JobStatus::Completed | JobStatus::Cancelled | JobStatus::Failed
		)
	}

	pub fn is_success(&self) -> bool {
		matches!(self, JobStatus::Completed)
	}

	pub fn is_pending(&self) -> bool {
		matches!(
			self,
			JobStatus::Running | JobStatus::Paused | JobStatus::Queued
		)
	}
}

impl std::fmt::Display for JobStatus {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			JobStatus::Running => write!(f, "RUNNING"),
			JobStatus::Paused => write!(f, "PAUSED"),
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
			"PAUSED" => JobStatus::Paused,
			"COMPLETED" => JobStatus::Completed,
			"CANCELLED" => JobStatus::Cancelled,
			"FAILED" => JobStatus::Failed,
			"QUEUED" => JobStatus::Queued,
			_ => unreachable!(),
		}
	}
}

impl From<String> for JobStatus {
	fn from(s: String) -> Self {
		JobStatus::from(s.as_str())
	}
}

/// A trait that defines the state of a job. State is frequently updated during execution,
/// and is used to track the progress of a job, so this trait defines a default [JobDataExt::update]
/// implementation to update the state with new data.
///
/// The state is also serialized and stored in the DB, so it must implement [Serialize] and [de::DeserializeOwned].
pub trait JobDataExt: Serialize + de::DeserializeOwned + Debug {
	/// Update the state with new data. By default, the implementation is a full replacement
	fn update(&mut self, updated: Self) {
		*self = updated;
	}

	/// Serialize the state to JSON. If serialization fails, the error is logged and None is returned.
	fn into_json(self) -> Option<serde_json::Value> {
		serde_json::to_value(&self).map_or_else(
			|error| {
				tracing::error!(?error, job_data = ?self, "Failed to serialize job data!");
				None
			},
			Some,
		)
	}
}

/// () is effectively a no-op state, which is useful for jobs that don't need to track state.
impl JobDataExt for () {
	fn update(&mut self, _: Self) {
		// Do nothing
	}
}

/// A log that will be persisted from a job's execution
#[derive(Debug, Deserialize, Serialize)]
pub struct JobExecuteLog {
	pub msg: String,
	pub context: Option<String>,
	pub level: LogLevel,
	pub timestamp: DateTime<Utc>,
}

impl JobExecuteLog {
	/// Construct a [JobExecuteLog] with the given msg and level
	pub fn new(msg: String, level: LogLevel) -> Self {
		Self {
			msg,
			context: None,
			level,
			timestamp: Utc::now(),
		}
	}

	/// Construct a [JobExecuteLog] with the given msg and [LogLevel::Error]
	pub fn error(msg: String) -> Self {
		Self {
			msg,
			context: None,
			level: LogLevel::Error,
			timestamp: Utc::now(),
		}
	}

	/// Construct a [JobExecuteLog] with the given msg and [LogLevel::Warn]
	pub fn warn(msg: &str) -> Self {
		Self {
			msg: msg.to_string(),
			context: None,
			level: LogLevel::Warn,
			timestamp: Utc::now(),
		}
	}

	pub fn with_ctx(self, ctx: String) -> Self {
		Self {
			context: Some(ctx),
			..self
		}
	}

	/// Constructs a Prisma create payload for the error
	pub fn into_prisma(self, job_id: String) -> (String, Vec<log::SetParam>) {
		(
			self.msg,
			vec![
				log::context::set(self.context),
				log::level::set(self.level.to_string()),
				log::timestamp::set(self.timestamp.into()),
				log::job::connect(job::id::equals(job_id.clone())),
				log::job_id::set(Some(job_id)),
			],
		)
	}
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WorkingState<D, T> {
	pub data: Option<D>,
	pub tasks: VecDeque<T>,
	pub completed_tasks: usize,
	pub logs: Vec<JobExecuteLog>,
}

pub struct JobState<J: JobExt> {
	job: J,
	data: Option<J::Data>,
	tasks: VecDeque<J::Task>,
	completed_tasks: usize,
	logs: Vec<JobExecuteLog>,
}

/// A trait that defines the behavior and data types of a job. Jobs are responsible for
/// intialization and individual task execution. Jobs are managed by an [Executor], which
/// is responsible for the main run loop of a job.
#[async_trait::async_trait]
pub trait JobExt: Send + Sync + Sized + 'static {
	const NAME: &'static str;

	/// Internal state used by the job. This is updated during execution but not persisted.
	/// If pausing/resuming is implemented, this will be serialized and stored in the DB.
	type Data: Serialize
		+ de::DeserializeOwned
		+ JobDataExt
		+ Default
		+ Debug
		+ Send
		+ Sync;
	type Task: Serialize + de::DeserializeOwned + Send + Sync;

	fn description(&self) -> Option<String>;

	/// A function that should be called in Self::init to initialize the job state with
	/// existing data from the DB (if any). Used to support pausing/resuming jobs.
	async fn attempt_restore(
		&self,
		ctx: &WorkerCtx,
	) -> Result<Option<WorkingState<Self::Data, Self::Task>>, JobError> {
		let db = ctx.db.clone();

		let stored_job = db
			.job()
			.find_unique(job::id::equals(ctx.job_id.clone()))
			.exec()
			.await?;

		match stored_job {
			Some(job) => {
				if let Some(save_state) = job.save_state {
					// If the job has a save state and it is invalid, we should fail
					// as to not attempt potentially undefined behaviors
					let state = serde_json::from_slice(&save_state)
						.map_err(|error| JobError::StateLoadFailed(error.to_string()))?;
					Ok(Some(state))
				} else {
					Ok(None)
				}
			},
			None => {
				// We don't need this job to exist in the DB for tests
				if cfg!(test) {
					Ok(None)
				} else {
					Err(JobError::InitFailed("Job not found in DB".to_string()))
				}
			},
		}
	}

	/// A function that is called before Self::run to initialize the job and gather the
	/// required tasks
	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Data, Self::Task>, JobError>;

	/// An optional function to perform any cleanup or finalization after the job has
	/// finished its run loop. This is called after the job has completed (when [Executor::run]
	/// returns an Ok).
	async fn cleanup(&self, _: &WorkerCtx, _: &Self::Data) -> Result<(), JobError> {
		Ok(())
	}

	/// A function to execute a specific task. This will be called repeatedly until all
	/// tasks are completed.
	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError>;
}

pub struct Job<J: JobExt> {
	id: Uuid,
	state: Option<JobState<J>>,
}

impl<J: JobExt> Job<J> {
	pub fn new(job: J) -> Box<Self> {
		Box::new(Self {
			id: Uuid::new_v4(),
			state: Some(JobState {
				job,
				data: None,
				tasks: VecDeque::new(),
				completed_tasks: 0,
				logs: vec![],
			}),
		})
	}
}

#[derive(Debug)]
pub struct ExecutorOutput {
	pub data: Option<serde_json::Value>,
	pub logs: Vec<JobExecuteLog>,
}

/// A trait that defines the behavior of a job executor. Executors are responsible for the main
/// run loop of a job, including task execution and state management. Executors are managed
/// by the [JobManagerAgent].
#[async_trait::async_trait]
pub trait Executor: Send + Sync {
	/// The ID of the internal job
	fn id(&self) -> Uuid;
	/// The name of the internal job
	fn name(&self) -> &'static str;
	/// The optional description for the internal job
	fn description(&self) -> Option<String>;
	/// A function to persist the state of the job to the DB. This is called immediately before the job
	/// would otherwise complete (at the end of [Executor::run]).
	async fn persist_state(
		&self,
		ctx: WorkerCtx,
		output: ExecutorOutput,
		elapsed: Duration,
	) -> Result<(), JobError> {
		let db = ctx.db.clone();
		let job_id = self.id();

		let expected_logs = output.logs.len();
		if expected_logs > 0 {
			let persisted_logs = db
				.log()
				.create_many(
					output
						.logs
						.into_iter()
						.map(|error| error.into_prisma(job_id.to_string()))
						.collect(),
				)
				.exec()
				.await
				.map_or_else(
					|error| {
						tracing::error!(?error, "Failed to persist job logs");
						0
					},
					|count| count as usize,
				);

			if persisted_logs != expected_logs {
				tracing::warn!(
					?persisted_logs,
					?expected_logs,
					"Failed to persist all job logs!"
				);
			}
		}

		let output_data = serde_json::to_vec(&output.data)
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		let persisted_job_with_data = db
			.job()
			.update(
				job::id::equals(job_id.to_string()),
				vec![
					job::save_state::set(None),
					job::output_data::set(Some(output_data)),
					job::status::set(JobStatus::Completed.to_string()),
					job::ms_elapsed::set(
						elapsed.as_millis().try_into().unwrap_or_else(|e| {
							tracing::error!(error = ?e, "Wow! Overflowed i64 during attempt to convert job duration to milliseconds");
							i64::MAX
						}),
					),
				],
			)
			.exec()
			.await
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;
		tracing::trace!(?persisted_job_with_data, "Persisted completed job to DB");

		Ok(())
	}
	/// A function to persist the failure of the job to the DB. This is called when the job
	/// has failed with a critical error (when [Executor::run] returns an Err).
	async fn persist_failure(
		&self,
		ctx: WorkerCtx,
		status: JobStatus,
		elapsed: Duration,
	) -> Result<(), JobError> {
		let db = ctx.db.clone();
		let job_id = self.id();

		if status.is_success() || status.is_pending() {
			return Err(JobError::StateSaveFailed(
				"Attempted to persist failure with non-failure status".to_string(),
			));
		}

		let _persisted_job = db
			.job()
			.update(
				job::id::equals(job_id.to_string()),
				vec![
					job::status::set(status.to_string()),
					job::ms_elapsed::set(
						elapsed.as_millis().try_into().unwrap_or_else(|e| {
							tracing::error!(error = ?e, "Wow! Overflowed i64 during attempt to convert job duration to milliseconds");
							i64::MAX
						}),
					),
				],
			)
			.exec()
			.await
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		Ok(())
	}
	/// The main run loop of the job. This is where tasks are executed and state is managed.
	async fn execute(&mut self, ctx: WorkerCtx) -> Result<ExecutorOutput, JobError>;
}

#[async_trait::async_trait]
impl<J: JobExt> Executor for Job<J> {
	fn id(&self) -> Uuid {
		self.id
	}

	fn name(&self) -> &'static str {
		J::NAME
	}

	fn description(&self) -> Option<String> {
		self.state.as_ref().and_then(|s| s.job.description())
	}

	async fn execute(&mut self, ctx: WorkerCtx) -> Result<ExecutorOutput, JobError> {
		ctx.report_progress(JobProgress::status_msg(
			JobStatus::Running,
			"Initializing job",
		));

		let job_id = self.id();
		let job_name = self.name();
		let commands_rx = ctx.commands_rx.clone();
		tracing::info!(?job_id, ?job_name, "Starting job");

		let JobState {
			mut job,
			data,
			mut tasks,
			mut completed_tasks,
			mut logs,
		} = self.state.take().ok_or_else(|| {
			JobError::InitFailed("Job state was unexpectedly None".to_string())
		})?;

		let mut working_data = if let Some(initial_data) = data {
			tracing::debug!(?initial_data, "Job started with initial state");
			Some(initial_data)
		} else if let Some(restore_point) = job.attempt_restore(&ctx).await? {
			// Replace the state with the restored state
			tasks = restore_point.tasks;
			completed_tasks = restore_point.completed_tasks;
			logs = restore_point.logs;

			ctx.report_progress(JobProgress::restored(
				completed_tasks as i32,
				tasks.len() as i32,
			));

			// Return the data from the restore point
			restore_point.data.or_else(|| Some(Default::default()))
		} else {
			tracing::debug!("No restore point found, initializing job");
			let init_result = job.init(&ctx).await?;
			tasks = init_result.tasks;
			completed_tasks = init_result.completed_tasks;
			logs = init_result.logs;

			ctx.report_progress(JobProgress::init_done(
				completed_tasks as i32,
				tasks.len() as i32,
			));

			// Return the data from the init result
			init_result.data.or_else(|| Some(Default::default()))
		}
		.ok_or_else(|| {
			JobError::InitFailed(
				"No data was created for job. This is a bug!?".to_string(),
			)
		})?;

		// Setup our references since the loop would otherwise take ownership
		let job = Arc::new(job);
		let mut ctx = Arc::new(ctx);

		tracing::debug!(task_count = tasks.len(), "Starting tasks");

		while !tasks.is_empty() {
			// The state can dynamically change during the run loop, and should be re-checked
			// at the start of each iteration. If the state is Paused, the loop should wait for
			// Running with a reasonable timeout before continuing.
			let mut worker_state = ctx.get_state().await;
			if worker_state == WorkerState::Paused {
				ctx.report_progress(JobProgress::msg("Paused acknowledged"));
				while worker_state == WorkerState::Paused {
					tracing::debug!("Job is paused. Waiting for resume...");
					// Wait for a reasonable amount of time before checking again
					worker_state = ctx.get_state().await;
					if worker_state == WorkerState::Running {
						ctx.report_progress(JobProgress::msg("Resume acknowledged"));
					}
					tokio::time::sleep(Duration::from_secs(5)).await;
				}
			}

			ctx.report_progress(JobProgress::task_position_msg(
				"Starting task",
				completed_tasks as i32,
				tasks.len() as i32,
			));

			let next_task = tasks.pop_front().ok_or_else(|| {
				JobError::TaskFailed(
					"No tasks unexpectedly remain! This is a bug?".to_string(),
				)
			})?;

			let task_handle = {
				let ctx = Arc::clone(&ctx);
				let job = Arc::clone(&job);
				spawn(async move { job.execute_task(&ctx, next_task).await })
			};

			let JobTaskHandlerOutput {
				output,
				returned_ctx,
			} = match job_task_handler::<J>(ctx, task_handle, commands_rx.clone()).await {
				Ok(r) => r,
				Err(e) => {
					tracing::error!(?e, "Task handler failed");
					logs.push(JobExecuteLog::error(format!(
						"Critical task error: {:?}",
						e.to_string()
					)));
					return Ok(ExecutorOutput {
						data: working_data.into_json(),
						logs,
					});
				},
			};
			let JobTaskOutput {
				data: task_data,
				logs: task_logs,
				subtasks,
			} = output;

			// Update our working data and any logs with the new data/logs from the
			// completed task. Then increment the task index
			working_data.update(task_data);
			logs.extend(task_logs);
			completed_tasks += 1;

			// Reassign the ctx to the returned values
			ctx = returned_ctx;

			// If there are subtasks, we need to insert them into the tasks queue at the
			// front, so they are executed next
			if !subtasks.is_empty() {
				let subtask_count = subtasks.len();
				let remaining_tasks = tasks.split_off(0);
				let mut new_tasks = VecDeque::from(subtasks);
				new_tasks.extend(remaining_tasks);
				tasks = new_tasks;
				ctx.report_progress(JobProgress::task_position_msg(
					format!(
						"{} subtask(s) discovered. Reordering the task queue",
						subtask_count
					)
					.as_str(),
					completed_tasks as i32,
					tasks.len() as i32,
				));
			}
		}

		tracing::debug!(
			?completed_tasks,
			final_task_count = tasks.len(), // Should be 0!
			"Task loop completed? Should be 0 tasks remaining 0.o"
		);

		ctx.report_progress(JobProgress::task_position(
			completed_tasks as i32,
			tasks.len() as i32,
		));

		let logs_count = logs.len();
		tracing::debug!(?logs_count, "All tasks completed");
		if let Err(err) = job.cleanup(&ctx, &working_data).await {
			logs.push(JobExecuteLog::error(format!(
				"Cleanup failed: {:?}",
				err.to_string()
			)));
		}

		Ok(ExecutorOutput {
			data: working_data.into_json(),
			logs,
		})
	}
}
