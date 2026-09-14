// https://github.com/rust-lang/rust-clippy/issues/12281
// ^ There is a bug in clippy after updating the toolchain. I am subscribed to the issue,
// and will remove this once it is resolved.
#![allow(clippy::blocks_in_conditions)]
// Note for posterity: I originally had a completely in-house job queue and processing system but
// have since migrated to offloading alllll that complexity to Apalis directly. The in-house version
// would not have been possible without the following other projects:
// - https://github.com/spacedriveapp/spacedrive
// - https://git.asonix.dog/asonix/background-jobs
// <3

use std::{collections::VecDeque, fmt::Debug};

use models::shared::enums::LogLevel;
use serde::{de, Deserialize, Serialize};

pub mod error;
mod output;
mod progress;
mod run;
mod scheduler;

pub mod state;
pub mod stump_job;

use chrono::{DateTime, Utc};
use error::JobError;
pub use models::shared::enums::JobStatus;
pub use output::*;
pub use progress::*;
pub use run::dispatch_job;
pub use scheduler::JobScheduler;

pub use state::{ApalisWorkerState, JobContext};

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
/// progress internally
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct WorkingState<O, T> {
	pub output: Option<O>,
	pub tasks: VecDeque<T>,
	pub logs: Vec<JobExecuteLog>,
}

impl<O, T> Default for WorkingState<O, T> {
	fn default() -> Self {
		Self {
			output: None,
			tasks: VecDeque::new(),
			logs: vec![],
		}
	}
}

/// A trait that defines the behavior and data types of a job
///
/// The lifecycle is: `init()` → `execute_task()` (loop) → `finalize()`.
#[async_trait::async_trait]
pub trait JobLifecycle: Send + Sync + Sized + 'static {
	const NAME: &'static str;

	/// The output type for the job. This is the data that will be persisted to the DB when the
	/// job completes. All jobs should have a user-friendly representation of their output.
	type Output: Serialize
		+ de::DeserializeOwned
		+ JobOutputExt
		+ Default
		+ Debug
		+ Send
		+ Sync;

	/// The type representing a single task for the job. Each task will be executed
	/// in a loop until all tasks are completed.
	///
	/// If a job should be small enough to not require tasks, this type should be set to `()`.
	/// In that scenario, the job should execute all of its logic in [`JobLifecycle::init`]
	type Task: Serialize + de::DeserializeOwned + Send + Sync;

	/// The description of the job, if any
	fn description(&self) -> Option<String>;

	/// Initialize the job and gather the required tasks
	async fn init(
		&mut self,
		ctx: &JobContext,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError>;

	/// Execute a single task. Called repeatedly until all tasks are completed
	async fn execute_task(
		&self,
		ctx: &JobContext,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError>;

	/// Optional finalization after all tasks have completed
	async fn finalize(
		&self,
		_ctx: &JobContext,
		_output: &Self::Output,
	) -> Result<(), JobError> {
		Ok(())
	}
}

/// The output of a single job task
#[derive(Debug, Serialize)]
pub struct JobTaskOutput<J: JobLifecycle> {
	pub output: J::Output,
	pub subtasks: Vec<J::Task>,
	pub logs: Vec<JobExecuteLog>,
}
