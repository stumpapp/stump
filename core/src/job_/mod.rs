use std::{collections::VecDeque, fmt::Debug, sync::Arc};

use prisma_client_rust::chrono::{DateTime, Utc};
use serde::{de, Deserialize, Serialize};

pub mod error;
mod manager;
mod task;
mod worker;

use error::JobError;
pub use task::JobTaskOutput;
use task::{job_task_handler, JobTaskHandlerOutput};
pub use worker::*;

pub use manager::*;
use tokio::spawn;
use uuid::Uuid;

use crate::prisma::job;

/// A trait that defines the state of a job. State is frequently updated during execution.
pub trait WritableData: Serialize + de::DeserializeOwned {
	fn store(&mut self, updated: Self) {
		*self = updated;
	}
}

/// () is effectively a no-op state, which is useful for jobs that don't need to track state.
impl WritableData for () {
	fn store(&mut self, _: Self) {
		// Do nothing
	}
}

#[derive(Debug, Deserialize, Serialize)]
pub struct JobRunError {
	pub msg: String,
	pub timestamp: DateTime<Utc>,
}

impl JobRunError {
	pub fn new(msg: String) -> Self {
		Self {
			msg,
			timestamp: Utc::now(),
		}
	}
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WorkingState<D, T> {
	pub data: Option<D>,
	pub tasks: VecDeque<T>,
	pub current_task_index: usize,
	pub errors: Vec<JobRunError>,
}

pub struct JobState<Job: DynJob> {
	stateful_job: Job,
	data: Option<Job::Data>,
	tasks: VecDeque<Job::Task>,
	current_task_index: usize,
	errors: Vec<JobRunError>,
}

#[async_trait::async_trait]
pub trait DynJob: Send + Sync + Sized + 'static {
	const NAME: &'static str;

	/// Internal state used by the job. This is updated during execution but not persisted.
	/// If pausing/resuming is implemented, this will be serialized and stored in the DB.
	type Data: Serialize
		+ de::DeserializeOwned
		+ WritableData
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
					let state = serde_json::from_slice(&save_state).map_err(|error| {
						JobError::StateDeserializeFailed(error.to_string())
					})?;
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

pub struct Job<SJ: DynJob> {
	id: Uuid,
	state: Option<JobState<SJ>>,
}

impl<SJ: DynJob> Job<SJ> {
	pub fn new(stateful_job: SJ) -> Box<Self> {
		Box::new(Self {
			id: Uuid::new_v4(),
			state: Some(JobState {
				stateful_job,
				data: None,
				tasks: VecDeque::new(),
				current_task_index: 0,
				errors: vec![],
			}),
		})
	}
}

#[derive(Debug)]
pub struct JobExecutorOutput {
	data: Option<serde_json::Value>,
	errors: Vec<JobRunError>,
}
#[async_trait::async_trait]
pub trait JobExecutor: Send + Sync {
	fn id(&self) -> Uuid;
	fn name(&self) -> &'static str;
	async fn run(
		&mut self,
		ctx: WorkerCtx,
		commands_rx: async_channel::Receiver<WorkerCommand>,
	) -> Result<JobExecutorOutput, JobError>;
}

#[async_trait::async_trait]
impl<J: DynJob> JobExecutor for Job<J> {
	fn id(&self) -> Uuid {
		self.id
	}

	fn name(&self) -> &'static str {
		J::NAME
	}

	async fn run(
		&mut self,
		ctx: WorkerCtx,
		commands_rx: async_channel::Receiver<WorkerCommand>,
	) -> Result<JobExecutorOutput, JobError> {
		let job_id = self.id();
		let job_name = self.name();
		tracing::info!(?job_id, ?job_name, "Starting job");

		let JobState {
			mut stateful_job,
			data,
			mut tasks,
			mut current_task_index,
			mut errors,
		} = self.state.take().expect("Job state was already taken!");

		let mut working_data = if let Some(state) = data {
			Some(state)
		} else if let Some(restore_point) = stateful_job.attempt_restore(&ctx).await? {
			// Replace the state with the restored state
			tasks = restore_point.tasks;
			current_task_index = restore_point.current_task_index;
			errors = restore_point.errors;

			// Return the data from the restore point
			restore_point.data.or_else(|| Some(Default::default()))
		} else {
			tracing::debug!("No restore point found, initializing job");
			let init_result = stateful_job.init(&ctx).await?;
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
		let stateful_job = Arc::new(stateful_job);
		let mut ctx = Arc::new(ctx);

		tracing::debug!(task_count = tasks.len(), "Starting tasks");

		while !tasks.is_empty() {
			let next_task = tasks.pop_front().expect("tasks is not empty??");

			let task_handle = {
				let ctx = Arc::clone(&ctx);
				let stateful_job = Arc::clone(&stateful_job);

				spawn(async move { stateful_job.execute_task(&ctx, next_task).await })
			};

			let JobTaskHandlerOutput {
				output,
				returned_ctx,
			} = job_task_handler::<J>(ctx, task_handle, commands_rx.clone()).await?;
			let JobTaskOutput {
				data: task_data,
				errors: task_errors,
				subtasks,
			} = output;

			// Update our working data and any errors with the new data/errors from the
			// completed task. Then increment the task index
			working_data.store(task_data);
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

		let out_data = serde_json::to_value(&working_data).map_or_else(
			|error| {
				tracing::error!(?error, job_data = ?working_data, "Failed to serialize job data!");
				None
			},
			|value| Some(value),
		);

		Ok(JobExecutorOutput {
			data: out_data,
			errors,
		})
	}
}
