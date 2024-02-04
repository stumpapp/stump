use std::{collections::VecDeque, fmt::Debug, sync::Arc};

use prisma_client_rust::chrono::{DateTime, Utc};
use serde::{de, Deserialize, Serialize};

pub mod error;
mod manager;
mod scheduler;
mod task;
mod worker;

use error::JobError;
pub use scheduler::JobScheduler;
use specta::Type;
pub use task::JobTaskOutput;
use task::{job_task_handler, JobTaskHandlerOutput};
use utoipa::ToSchema;
pub use worker::*;

pub use manager::*;
use tokio::spawn;
use uuid::Uuid;

use crate::{
	db::entity::LogLevel,
	prisma::{job, log},
};

#[derive(Clone, Debug, Default, Serialize, Deserialize, Type, ToSchema)]
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
		self == JobStatus::Completed
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

#[derive(Debug, Deserialize, Serialize)]
pub struct JobUpdate {
	id: String,
	#[serde(flatten)]
	payload: JobProgress,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JobProgress {
	status: Option<JobStatus>,
	message: Option<String>,
	queue_position: Option<i32>,
	queue_size: Option<i32>,
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
			|value| Some(value),
		)
	}
}

/// () is effectively a no-op state, which is useful for jobs that don't need to track state.
impl JobDataExt for () {
	fn update(&mut self, _: Self) {
		// Do nothing
	}
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JobRunError {
	pub msg: String,
	pub timestamp: DateTime<Utc>,
}

// TODO: persisted warnings? If so, just change to JobRunLog with a LogLevel

impl JobRunError {
	pub fn new(msg: String) -> Self {
		Self {
			msg,
			timestamp: Utc::now(),
		}
	}

	/// Constructs a Prisma create payload for the error
	pub fn into_prisma(self, job_id: String) -> (String, Vec<log::SetParam>) {
		(
			self.msg,
			vec![
				log::level::set(LogLevel::Error.to_string()),
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
	pub current_task_index: usize,
	pub errors: Vec<JobRunError>,
}

pub struct JobState<J: JobExt> {
	job: J,
	data: Option<J::Data>,
	tasks: VecDeque<J::Task>,
	current_task_index: usize,
	errors: Vec<JobRunError>,
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
				current_task_index: 0,
				errors: vec![],
			}),
		})
	}
}

#[derive(Debug)]
pub struct ExecutorOutput {
	pub data: Option<serde_json::Value>,
	pub errors: Vec<JobRunError>,
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
	/// A function to persist the state of the job to the DB. This is called after the job
	/// has completed (when [Executor::run] returns an Ok).
	async fn persist_state(
		&self,
		ctx: WorkerCtx,
		output: ExecutorOutput,
	) -> Result<(), JobError> {
		let db = ctx.db.clone();
		let job_id = self.id();

		let expected_errors = output.errors.len();
		if expected_errors > 0 {
			let persisted_errors = db
				.log()
				.create_many(
					output
						.errors
						.into_iter()
						.map(|error| error.into_prisma(job_id.to_string()))
						.collect(),
				)
				.exec()
				.await
				.map_or_else(
					|error| {
						tracing::error!(?error, "Failed to persist job errors");
						0
					},
					|count| count as usize,
				);

			if persisted_errors != expected_errors {
				tracing::warn!(
					?persisted_errors,
					?expected_errors,
					"Failed to persist all job errors!"
				);
			}
		}

		let save_state = serde_json::to_vec(&output.data)
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		let _persisted_job_with_state = db
			.job()
			.update(
				job::id::equals(job_id.to_string()),
				vec![
					job::save_state::set(Some(save_state)),
					job::status::set(JobStatus::Completed.to_string()),
				],
			)
			.exec()
			.await
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		Ok(())
	}
	/// A function to persist the failure of the job to the DB. This is called when the job
	/// has failed with a critical error (when [Executor::run] returns an Err).
	async fn persist_failure(
		&self,
		ctx: WorkerCtx,
		status: JobStatus,
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
				vec![job::status::set(status.to_string())],
			)
			.exec()
			.await
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		Ok(())
	}
	/// The main run loop of the job. This is where tasks are executed and state is managed.
	async fn run(&mut self, ctx: WorkerCtx) -> Result<ExecutorOutput, JobError>;
}

#[async_trait::async_trait]
impl<J: JobExt> Executor for Job<J> {
	fn id(&self) -> Uuid {
		self.id
	}

	fn name(&self) -> &'static str {
		J::NAME
	}

	async fn run(&mut self, ctx: WorkerCtx) -> Result<ExecutorOutput, JobError> {
		let job_id = self.id();
		let job_name = self.name();
		let commands_rx = ctx.command_receiver.clone();
		tracing::info!(?job_id, ?job_name, "Starting job");

		let JobState {
			mut job,
			data,
			mut tasks,
			mut current_task_index,
			mut errors,
		} = self.state.take().expect("Job state was already taken!");

		let mut working_data = if let Some(state) = data {
			Some(state)
		} else if let Some(restore_point) = job.attempt_restore(&ctx).await? {
			// Replace the state with the restored state
			tasks = restore_point.tasks;
			current_task_index = restore_point.current_task_index;
			errors = restore_point.errors;

			// Return the data from the restore point
			restore_point.data.or_else(|| Some(Default::default()))
		} else {
			tracing::debug!("No restore point found, initializing job");
			let init_result = job.init(&ctx).await?;
			tasks = init_result.tasks;
			current_task_index = init_result.current_task_index;
			errors = init_result.errors;

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
					errors.push(JobRunError::new(format!(
						"Critical task error: {:?}",
						e.to_string()
					)));
					return Ok(ExecutorOutput {
						data: working_data.into_json(),
						errors,
					});
				},
			};
			let JobTaskOutput {
				data: task_data,
				errors: task_errors,
				subtasks,
			} = output;

			// Update our working data and any errors with the new data/errors from the
			// completed task. Then increment the task index
			working_data.update(task_data);
			errors.extend(task_errors);
			current_task_index += 1;

			// Reassign the ctx to the returned values
			ctx = returned_ctx;

			// If there are subtasks, we need to insert them into the tasks queue at the
			// front, so they are executed next
			let remaining_tasks = tasks.split_off(0);
			let mut new_tasks = VecDeque::from(subtasks);
			new_tasks.extend(remaining_tasks);
			tasks = new_tasks;
		}

		tracing::debug!(
			?current_task_index,
			task_count = tasks.len(),
			"Task loop completed?"
		);

		let errors_count = errors.len();
		tracing::debug!(?errors_count, "All tasks completed");

		Ok(ExecutorOutput {
			data: working_data.into_json(),
			errors,
		})
	}
}
