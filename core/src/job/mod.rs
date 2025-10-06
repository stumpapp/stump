// https://github.com/rust-lang/rust-clippy/issues/12281
// ^ There is a bug in clippy after updating the toolchain. I am subscribed to the issue,
// and will remove this once it is resolved.
#![allow(clippy::blocks_in_conditions)]
// This job module would not be possible without other awesome projects in the Rust ecosystem! They
// taught me a lot, and I don't think I could have done this without them. Taking bits and pieces from
// each of them, I was able to create a job system that is both flexible and powerful:
// - https://github.com/spacedriveapp/spacedrive --> The most impressive and influential one, the concept of jobs having typed tasks executed one-by-one in a loop, in addition to the handling logic for pause/resume, came from here
// - https://git.asonix.dog/asonix/background-jobs --> Trait design (v similar to above) and how they handle retries
// - https://github.com/ZeroAssumptions/aide-de-camp
// 		- Also their writeup on the fundamentals of their design: https://dev.to/zeroassumptions/build-a-job-queue-with-rust-using-aide-de-camp-part-1-4g5m
// - https://github.com/lorepozo/workerpool
// - https://github.com/geofmureithi/apalis
// - https://github.com/SabrinaJewson/work-queue.rs
// - https://github.com/Nukesor/pueue
use std::{collections::VecDeque, fmt::Debug, sync::Arc, time::Duration};

use models::{
	entity::{job, log},
	shared::enums::{JobStatus, LogLevel},
};
use sea_orm::{prelude::*, QuerySelect, Set};
use serde::{de, Deserialize, Serialize};

mod controller;
pub mod error;
mod manager;
mod output;
mod progress;
mod scheduler;
mod task;
mod worker;

use chrono::{DateTime, Utc};
use error::JobError;
pub use output::*;
pub use progress::*;
pub use scheduler::JobScheduler;
pub use task::JobTaskOutput;
use task::{job_task_handler, JobTaskHandlerOutput};
pub use worker::*;

pub use controller::*;
pub use manager::*;
use uuid::Uuid;

/// The retry policy for a job. This is used to determine if a job should be requeued after
/// a non-critical failure.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum JobRetryPolicy {
	/// Always retry the job when it fails
	Infinite,
	/// Only retry the job a fixed number of times before giving up
	Count(usize),
}

/// A log that will be persisted from a job's execution
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct JobExecuteLog {
	pub msg: String,
	pub context: Option<String>,
	pub level: LogLevel,
	pub timestamp: DateTime<Utc>,
}

impl JobExecuteLog {
	/// Construct a [`JobExecuteLog`] with the given msg and level
	pub fn new(msg: String, level: LogLevel) -> Self {
		Self {
			msg,
			context: None,
			level,
			timestamp: Utc::now(),
		}
	}

	/// Construct a [`JobExecuteLog`] with the given msg and [`LogLevel::Error`]
	pub fn error(msg: String) -> Self {
		Self {
			msg,
			context: None,
			level: LogLevel::Error,
			timestamp: Utc::now(),
		}
	}

	/// Construct a [`JobExecuteLog`] with the given msg and [`LogLevel::Warn`]
	pub fn warn(msg: &str) -> Self {
		Self {
			msg: msg.to_string(),
			context: None,
			level: LogLevel::Warn,
			timestamp: Utc::now(),
		}
	}

	/// Construct a new [`JobExecuteLog`] with the given context string
	pub fn with_ctx(self, ctx: String) -> Self {
		Self {
			context: Some(ctx),
			..self
		}
	}
}

/// The working state of a job. This is frequently updated during execution, and is used to track
/// progress internally. The entire state is only persisted when a job is paused, otherwise only
/// the data and logs are persisted.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WorkingState<O, T> {
	pub output: Option<O>,
	pub tasks: VecDeque<T>,
	pub completed_tasks: usize,
	pub logs: Vec<JobExecuteLog>,
}

impl<O, T> Default for WorkingState<O, T> {
	fn default() -> Self {
		Self {
			output: None,
			tasks: VecDeque::new(),
			completed_tasks: 0,
			logs: vec![],
		}
	}
}

/// A trait that defines the behavior and data types of a job. Jobs are responsible for
/// initialization and individual task execution. Jobs are managed by an [Executor], which
/// is responsible for the main run loop of a job.
#[async_trait::async_trait]
pub trait JobExt: Send + Sync + Sized + Clone + 'static {
	const NAME: &'static str;
	const MAX_RETRIES: JobRetryPolicy = JobRetryPolicy::Count(0);

	/// The output type for the job. This is the data that will be persisted to the DB when the
	/// job completes. All jobs should have a user-friendly representation of their output.
	type Output: Serialize
		+ de::DeserializeOwned
		+ JobOutputExt
		+ Default
		+ Debug
		+ Send
		+ Sync;
	/// The type representing a single task for the job. As the name implies, each task will
	/// be executed in its own asynchronous task in a loop until all tasks are completed.
	///
	/// If a job should be small enough to not require tasks, this type should be set to (). In
	/// this scenario, the job should execute all of its logic in the [JobExt::init] function.
	type Task: Serialize + de::DeserializeOwned + Send + Sync;

	/// The description of the job, if any
	fn description(&self) -> Option<String>;

	/// A function that will be called in [Executor::execute] to initialize the job state with
	/// existing data from the DB (if any). Used to support pausing/resuming jobs.
	///
	/// Note that when defining a new job, you should not need to invoke this function directly. The
	/// [Executor] will handle this for you during the beginning of the job's execution.
	#[tracing::instrument(level = "debug", skip(self, ctx))]
	async fn attempt_restore(
		&self,
		ctx: &WorkerCtx,
	) -> Result<Option<WorkingState<Self::Output, Self::Task>>, JobError> {
		let conn = ctx.conn.as_ref();

		let stored_job = job::Entity::find_by_id(ctx.job_id.clone())
			.select_only()
			.column(job::Column::SaveState)
			.into_model::<job::SaveStateSelect>()
			.one(conn)
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

	/// A function to persist the current working state of the job to the DB. This is called
	/// when the job is paused in the event that a shutdown occurs before it can be resumed.
	///
	/// Note that when defining a new job, you should not need to invoke this function directly. The
	/// [Executor] will handle this for you whenever the job is paused.
	#[tracing::instrument(level = "debug", err, skip(self, ctx, tasks, logs))]
	async fn persist_restore_point(
		&self,
		ctx: &WorkerCtx,
		output: &Self::Output,
		tasks: &VecDeque<Self::Task>,
		completed_tasks: usize,
		logs: &Vec<JobExecuteLog>,
	) -> Result<(), JobError> {
		let conn = ctx.conn.as_ref();
		let job_id = ctx.job_id.clone();

		let json_output = serde_json::to_value(output)
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;
		let json_tasks = serde_json::to_value(tasks)
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;
		let json_logs = serde_json::to_value(logs)
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		let working_state = serde_json::json!({
			"output": json_output,
			"tasks": json_tasks,
			"completed_tasks": completed_tasks,
			"logs": json_logs,
		});

		let save_state = serde_json::to_vec(&working_state)
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		let affected_rows = job::Entity::update_many()
			.filter(job::Column::Id.eq(job_id.clone()))
			.col_expr(job::Column::SaveState, Expr::value(Some(save_state)))
			.exec(conn)
			.await?
			.rows_affected;

		if affected_rows == 0 {
			return Err(JobError::StateSaveFailed(
				"Failed to persist job save state to DB".to_string(),
			));
		}

		Ok(())
	}

	/// A function that is called before Self::execute to initialize the job and gather the
	/// required tasks
	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError>;

	/// An optional function to perform any cleanup or finalization after the job has
	/// finished its run loop. This is called after the job has completed (when [Executor::execute]
	/// returns an Ok).
	async fn cleanup(
		&self,
		_: &WorkerCtx,
		_: &Self::Output,
	) -> Result<Option<Box<dyn Executor>>, JobError> {
		Ok(None)
	}

	// TODO: notify_output(&self, output: &Self::Output) -> Result<(), JobError> { Ok(()) }

	/// An optional function to determine if a task should be requeued. This is called after
	/// a job fully completes in a non-successful state, but not after critical task errors.
	/// The default implementation is to requeue per the job's retry policy. This can be
	/// overridden to provide custom requeue logic.
	///
	/// Note that the exception to the above is that it **won't** be called after a manual cancellation
	fn should_requeue(&self, attempts: usize) -> bool {
		match Self::MAX_RETRIES {
			JobRetryPolicy::Infinite => true,
			JobRetryPolicy::Count(count) => attempts < count,
		}
	}

	/// A function to execute a specific task. This will be called repeatedly until all
	/// tasks are completed.
	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError>;
}

/// A wrapper struct that will act as the main [Executor] for jobs defined throughout
/// Stump.
pub struct WrappedJob<J: JobExt> {
	/// The ID of the job, which is created _first_ via this wrapper and will get persisted to the DB
	/// afterwords
	id: Uuid,
	/// The internal job that will be executed. This is an Option to allow for the job to be
	/// taken out of the wrapper and put back in after a requeue
	inner_job: Option<J>,
	/// The initial state of the job, used to build its working state. This is an Option to allow for
	/// the state to be taken out of the wrapper without a clone. At the end of the job, the state
	/// will be reinitialized to its default state.
	initial_state: Option<WorkingState<J::Output, J::Task>>,
	/// The number of attempts the job has made thus far. This is used to determine if the job
	/// should be requeued. Requeue logic is defined externally in the job's implementation.
	attempts: usize,
}

impl<J: JobExt> WrappedJob<J> {
	/// Create a new [`WrappedJob`] with the given job, wrapping itself in a Box
	pub fn new(job: J) -> Box<Self> {
		Box::new(Self {
			id: Uuid::new_v4(),
			inner_job: Some(job),
			initial_state: Some(WorkingState {
				output: None,
				tasks: VecDeque::new(),
				completed_tasks: 0,
				logs: vec![],
			}),
			attempts: 0,
		})
	}
}

/// The output of a job's execution. To avoid the need for a generic type, the output data is serialized
/// _prior_ to being returned from the [`Executor::execute`] function.
pub struct ExecutorOutput {
	pub output: Option<serde_json::Value>,
	pub logs: Vec<JobExecuteLog>,
	pub next_job: Option<Box<dyn Executor>>,
}

impl Debug for ExecutorOutput {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		f.debug_struct("ExecutorOutput")
			.field("output", &self.output)
			.field("logs", &self.logs)
			.field("next_job", &self.next_job.as_ref().map(|j| j.name()))
			.finish()
	}
}

/// A trait that defines the behavior of a job executor. Executors are responsible for the main
/// run loop of a job, including task execution and state management. Executors are managed
/// by the [JobManager].
#[async_trait::async_trait]
pub trait Executor: Send + Sync {
	/// The ID of the internal job
	fn id(&self) -> Uuid;
	/// The name of the internal job
	fn name(&self) -> &'static str;
	/// The optional description for the internal job
	fn description(&self) -> Option<String>;
	/// A function to determine if a job should be requeued. This is called after
	/// a job fully completes in a non-successful state, but not after critical task errors.
	///
	/// Note that the exception to the above is that it **won't** be called after a manual cancellation
	fn should_requeue(&self) -> bool;
	/// A function to persist the data of the job to the DB. This is called immediately before the job
	/// would otherwise complete (at the end of [Executor::execute]).
	async fn persist_output(
		&self,
		ctx: WorkerCtx,
		output: ExecutorOutput,
		elapsed: Duration,
	) -> Result<(), JobError> {
		let conn = ctx.conn.as_ref();
		let job_id = self.id();

		let expected_logs = output.logs.len();

		if expected_logs > 0 {
			let active_models = output.logs.into_iter().map(|log| log::ActiveModel {
				job_id: Set(Some(job_id.to_string())),
				level: Set(log.level),
				message: Set(log.msg),
				timestamp: Set(log.timestamp.into()),
				context: Set(log.context),
				..Default::default()
			});

			if let Err(error) = log::Entity::insert_many(active_models).exec(conn).await {
				tracing::error!(?error, "Failed to persist job logs to DB");
			}
		}

		let output_data = serde_json::to_vec(&output.output)
			.map_err(|error| JobError::StateSaveFailed(error.to_string()))?;

		let affected_rows = job::Entity::update_many()
			.filter(job::Column::Id.eq(job_id.to_string()))
			.col_expr(job::Column::SaveState, Expr::value(None::<Vec<u8>>))
			.col_expr(job::Column::OutputData, Expr::value(Some(output_data)))
			.col_expr(
				job::Column::Status,
				Expr::value(JobStatus::Completed.to_string()),
			)
			.col_expr(
				job::Column::MsElapsed,
				Expr::value(elapsed.as_millis() as i64),
			)
			.exec(conn)
			.await?
			.rows_affected;

		if affected_rows == 0 {
			return Err(JobError::StateSaveFailed(
				"Failed to persist job output to DB".to_string(),
			));
		}

		Ok(())
	}
	/// A function to persist the failure of the job to the DB. This is called when the job
	/// has failed with a critical error (when [Executor::execute] returns an Err).
	async fn persist_failure(
		&self,
		ctx: WorkerCtx,
		status: JobStatus,
		elapsed: Duration,
	) -> Result<(), JobError> {
		let conn = ctx.conn.as_ref();
		let job_id = self.id();

		if status.is_success() || status.is_pending() {
			tracing::error!(
				?status,
				"Attempted to persist failure with non-failure status!? This is a bug!"
			);
			return Err(JobError::StateSaveFailed(
				"Attempted to persist failure with non-failure status".to_string(),
			));
		}

		let affected_rows = job::Entity::update_many()
			.filter(job::Column::Id.eq(job_id.to_string()))
			.col_expr(job::Column::Status, Expr::value(status.to_string()))
			.col_expr(
				job::Column::MsElapsed,
				Expr::value(elapsed.as_millis() as i64),
			)
			.exec(conn)
			.await?
			.rows_affected;

		if affected_rows == 0 {
			return Err(JobError::StateSaveFailed(
				"Failed to persist job failure to DB".to_string(),
			));
		}

		Ok(())
	}
	/// The main run loop of the job. This is where tasks are executed and state is managed.
	async fn execute(&mut self, ctx: WorkerCtx) -> Result<ExecutorOutput, JobError>;
}

#[async_trait::async_trait]
impl<J: JobExt> Executor for WrappedJob<J> {
	fn id(&self) -> Uuid {
		self.id
	}

	fn name(&self) -> &'static str {
		J::NAME
	}

	fn description(&self) -> Option<String> {
		self.inner_job.as_ref().and_then(JobExt::description)
	}

	fn should_requeue(&self) -> bool {
		self.inner_job
			.as_ref()
			.is_some_and(|job| job.should_requeue(self.attempts))
	}

	async fn execute(&mut self, ctx: WorkerCtx) -> Result<ExecutorOutput, JobError> {
		ctx.report_progress(JobProgress::status_msg(
			JobStatus::Running,
			"Initializing job",
		));

		self.attempts += 1;
		let job_id = self.id();
		let job_name = self.name();
		let commands_rx = ctx.commands_rx.clone();
		tracing::info!(?job_id, ?job_name, "Starting job");

		let mut inner_job = self.inner_job.take().ok_or_else(|| {
			JobError::InitFailed("Job was unexpectedly None".to_string())
		})?;
		let WorkingState {
			output,
			mut tasks,
			mut completed_tasks,
			mut logs,
		} = self.initial_state.take().unwrap_or_else(|| {
			tracing::warn!(
				current_attempt = self.attempts,
				"Initial state was not defined for job. This is a bug!"
			);
			WorkingState::default()
		});

		let mut working_output = if let Some(initial_data) = output {
			tracing::debug!(?initial_data, "Job started with initial state");
			Some(initial_data)
		} else if let Some(restore_point) = inner_job.attempt_restore(&ctx).await? {
			// Replace the state with the restored state
			tasks = restore_point.tasks;
			completed_tasks = restore_point.completed_tasks;
			logs = restore_point.logs;

			ctx.report_progress(JobProgress::restored(
				completed_tasks as i32,
				tasks.len() as i32,
			));

			// Return the data from the restore point
			restore_point.output.or_else(|| Some(Default::default()))
		} else {
			tracing::debug!("No restore point found, initializing job");
			let init_result = inner_job.init(&ctx).await?;
			tasks = init_result.tasks;
			completed_tasks = init_result.completed_tasks;
			logs = init_result.logs;

			ctx.report_progress(JobProgress::init_done(
				completed_tasks as i32,
				tasks.len() as i32,
			));

			// Return the data from the init result
			init_result.output.or_else(|| Some(Default::default()))
		}
		.ok_or_else(|| {
			JobError::InitFailed(
				"No data was created for job. This is a bug!?".to_string(),
			)
		})?;

		// Setup our references since the loop would otherwise take ownership
		let job = Arc::new(inner_job.clone());
		let mut ctx = Arc::new(ctx);

		tracing::debug!(task_count = tasks.len(), "Starting tasks");

		while !tasks.is_empty() {
			// The state can dynamically change during the run loop, and should be re-checked
			// at the start of each iteration. If the state is Paused, the loop should wait for
			// Running with a reasonable timeout before continuing.
			let mut worker_status = ctx.get_status().await;
			if worker_status == WorkerStatus::Paused {
				ctx.report_progress(JobProgress::msg("Paused acknowledged"));
				let save_result = job
					.persist_restore_point(
						&ctx,
						&working_output,
						&tasks,
						completed_tasks,
						&logs,
					)
					.await;
				tracing::debug!(?save_result, "Persisted restore point?");
				while worker_status == WorkerStatus::Paused {
					tracing::debug!("Job is paused. Waiting for resume...");
					if worker_status == WorkerStatus::Running {
						ctx.report_progress(JobProgress::msg("Resume acknowledged"));
					}
					// Wait for a reasonable amount of time before checking again
					tokio::time::sleep(Duration::from_secs(5)).await;
					worker_status = ctx.get_status().await;
				}
			}

			ctx.report_progress(JobProgress::task_position_msg(
				"Starting task",
				completed_tasks as i32,
				tasks.len() as i32,
			));

			let next_task = tasks.pop_front().ok_or_else(|| {
				tracing::error!(completed_tasks, "No tasks remain after explicit check!");
				JobError::TaskFailed(
					"No tasks unexpectedly remain! This doesn't make sense!".to_string(),
				)
			})?;

			let task_handle = {
				let ctx = Arc::clone(&ctx);
				let job = Arc::clone(&job);
				tokio::spawn(async move { job.execute_task(&ctx, next_task).await })
			};

			let JobTaskHandlerOutput {
				output,
				returned_ctx,
			} = match job_task_handler::<J>(ctx, task_handle, commands_rx.clone()).await {
				Ok(r) => r,
				Err(e) => {
					tracing::error!(?e, "Task handler failed");
					logs.push(JobExecuteLog::error(format!("Critical task error: {e}")));
					return Ok(ExecutorOutput {
						output: working_output.into_json(),
						logs,
						next_job: None,
					});
				},
			};
			let JobTaskOutput {
				output: task_output,
				logs: task_logs,
				subtasks,
			} = output;

			// Update our working data and any logs with the new data/logs from the
			// completed task. Then increment the task index
			working_output.update(task_output);
			logs.extend(task_logs);
			completed_tasks += 1;

			// Reassign the ctx to the returned values
			ctx = returned_ctx;

			// If there are subtasks, we need to insert them into the tasks queue at the
			// front, so they are executed next. I think this can be polarizing, since on the
			// UI it would be surprising to see the task count go up after a task is completed lol
			// However, this is the most performant way aside from queueing the subtasks at the end
			// as separate jobs, which could balloon the queue with a lot of small jobs.
			if !subtasks.is_empty() {
				let subtask_count = subtasks.len();
				let remaining_tasks = tasks.split_off(0);
				let mut new_tasks = VecDeque::from(subtasks);
				new_tasks.extend(remaining_tasks);
				tasks = new_tasks;
				ctx.report_progress(JobProgress::task_position_msg(
					format!(
						"{subtask_count} subtask(s) discovered. Reordering the task queue",
					)
					.as_str(),
					completed_tasks as i32,
					tasks.len() as i32,
				));
			}
		}

		tracing::trace!(
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
		let next_job = match job.cleanup(&ctx, &working_output).await {
			Ok(next_job) => next_job,
			Err(e) => {
				tracing::error!(?e, "Cleanup failed");
				logs.push(JobExecuteLog::error(format!(
					"Cleanup failed: {:?}",
					e.to_string()
				)));
				None
			},
		};

		// Replace the state with defaults. This is to ensure there is a reset in the
		// event of a requeue
		self.initial_state = Some(WorkingState::default());
		// Put the inner job back into the WrappedJob
		self.inner_job = Some(inner_job);

		tracing::info!(?job_id, ?job_name, "Job execution complete");

		Ok(ExecutorOutput {
			output: working_output.into_json(),
			logs,
			next_job,
		})
	}
}
