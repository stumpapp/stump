use std::{collections::VecDeque, path::PathBuf, sync::Arc};

use futures::StreamExt;
use globset::GlobSet;
use serde::{de, Deserialize, Serialize};

mod error;
mod manager;
mod task;
mod worker;

use task::{job_task_handler, JobTaskHandlerOutput, JobTaskOutput};
pub use worker::*;

pub use error::*;
pub use manager::*;
use tokio::spawn;
use uuid::Uuid;

use crate::{
	db::entity::LibraryOptions,
	filesystem::scanner::{walk_library, WalkedLibrary, WalkerCtx},
	prisma::{job, library, library_options},
};

/// An enum that defines the actor that initiated a job (e.g. a user, another job, or the system)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum JobInitActor {
	User(String),
	Job(String),
	System,
}

/// A trait that defines the state of a job. State is frequently updated during execution.
pub trait MutableData: Serialize + de::DeserializeOwned {
	fn store(&mut self, updated: Self) {
		*self = updated;
	}
}

/// () is effectively a no-op state, which is useful for jobs that don't need to track state.
impl MutableData for () {
	fn store(&mut self, _: Self) {
		// Do nothing
	}
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WorkingState<D, T> {
	data: Option<D>,
	tasks: VecDeque<T>,
	current_task_index: usize,
	errors: Vec<String>,
}

pub struct JobState<Job: DynJob> {
	stateful_job: Job,
	data: Option<Job::Data>,
	tasks: VecDeque<Job::Task>,
	current_task_index: usize,
	errors: Vec<String>,
}

#[async_trait::async_trait]
pub trait DynJob: Send + Sync + Sized + 'static {
	const NAME: &'static str;

	/// Internal state used by the job. This is updated during execution but not persisted.
	/// If pausing/resuming is implemented, this will be serialized and stored in the DB.
	type Data: Serialize + de::DeserializeOwned + MutableData + Default + Send + Sync;
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
			.await?
			.ok_or(JobError::InitFailed("Job not found in DB".to_string()))?;

		if let Some(save_state) = stored_job.save_state {
			// If the job has a save state and it is invalid, we should fail
			// as to not attempt potentially undefined behaviors
			let state = serde_json::from_slice(&save_state)
				.map_err(|error| JobError::StateDeserializeFailed(error.to_string()))?;
			Ok(Some(state))
		} else {
			Ok(None)
		}
	}

	/// A function that is called before Self::run to initialize the job and gather the
	/// required tasks
	async fn init(
		&self,
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

#[async_trait::async_trait]
pub trait JobExecutor: Send + Sync {
	fn id(&self) -> Uuid;
	fn name(&self) -> &'static str;
	async fn run(
		&mut self,
		ctx: WorkerCtx,
		commands_rx: async_channel::Receiver<WorkerCommand>,
	) -> Result<(), JobError>;
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
	) -> Result<(), JobError> {
		let job_id = self.id();
		let job_name = self.name();
		tracing::info!(?job_id, ?job_name, "Starting job");

		let JobState {
			stateful_job,
			data,
			mut tasks,
			mut current_task_index,
			mut errors,
		} = self.state.take().expect("Job state was already taken!");
		let mut is_running = true;

		// TODO: this will always be None for now... Thereby not running the job lol
		let working_data = if let Some(state) = data {
			Some(state)
		} else if let Some(restore_point) = stateful_job.attempt_restore(&ctx).await? {
			// Replace the state with the restored state
			tasks = restore_point.tasks;
			current_task_index = restore_point.current_task_index;
			errors = restore_point.errors;

			// Return the data from the restore point
			restore_point.data
		} else {
			None
		};

		let mut stateful_job = Arc::new(stateful_job);
		let mut ctx = Arc::new(ctx);

		let data: Option<J::Data> = if let Some(mut working_data) = working_data {
			while is_running && !tasks.is_empty() {
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
					new_data,
					errors: task_errors,
				} = output;

				// Update our working data and any errors with the new data/errors from the
				// completed task. Then increment the task index
				working_data.store(new_data);
				errors.extend(task_errors);
				current_task_index += 1;

				// Reassign the ctx to the returned values
				ctx = returned_ctx;
			}

			unimplemented!()
		} else {
			None
		};

		Ok(())
	}
}

/*

-----------------------------------------------------------------------------------------
SCRATCHPAD BELOW!! Just used for testing the tentative job system design changes above...
-----------------------------------------------------------------------------------------


*/

#[derive(Serialize, Deserialize)]
enum LibraryScanTask {
	Init(InitTaskInput),
	WalkSeries(PathBuf),
}

#[derive(Serialize, Deserialize)]
struct InitTaskInput {
	series_to_create: Vec<PathBuf>,
	missing_series: Vec<PathBuf>,
}

struct LibraryScanJob {
	path: String,
}

#[derive(Serialize, Deserialize, Default)]
struct LibraryScanData {
	/// The number of files to scan relative to the library root
	total_files: u64,

	created_media: u64,
	updated_media: u64,

	created_series: u64,
	updated_series: u64,
}

impl MutableData for LibraryScanData {}

#[derive(Serialize, Deserialize)]
struct LibraryScanJobOutput {}

#[async_trait::async_trait]
impl DynJob for LibraryScanJob {
	const NAME: &'static str = "library_scan";

	type Data = LibraryScanData;
	type Task = LibraryScanTask;

	async fn init(
		&self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Data, Self::Task>, JobError> {
		if let Some(restore_point) = self.attempt_restore(ctx).await? {
			// TODO: consider more logging here
			tracing::debug!("Restoring library scan job from save state");
			return Ok(restore_point);
		}

		let library_options = ctx
			.db
			.library_options()
			.find_first(vec![library_options::library::is(vec![
				library::path::equals(self.path.clone()),
			])])
			.exec()
			.await?
			.map(LibraryOptions::from)
			.ok_or(JobError::InitFailed("Library not found".to_string()))?;
		let is_collection_based = library_options.is_collection_based();

		let WalkedLibrary {
			series_to_create,
			series_to_visit,
			missing_series,
			library_is_missing,
			..
		} = walk_library(
			&self.path,
			WalkerCtx {
				db: ctx.db.clone(),
				ignore_rules: GlobSet::empty(),
				max_depth: is_collection_based.then(|| 1),
			},
		)
		.await?;

		if library_is_missing {
			// TODO: mark library as missing in DB
			return Err(JobError::InitFailed(
				"Library could not be found on disk".to_string(),
			));
		}

		let init_task_input = InitTaskInput {
			series_to_create: series_to_create.clone(),
			missing_series: missing_series,
		};

		let series_to_visit = series_to_visit
			.into_iter()
			.map(LibraryScanTask::WalkSeries)
			.chain(
				series_to_create
					.into_iter()
					.map(LibraryScanTask::WalkSeries),
			)
			.collect::<Vec<LibraryScanTask>>();

		let tasks = VecDeque::from(
			[LibraryScanTask::Init(init_task_input)]
				.into_iter()
				.chain(series_to_visit)
				.collect::<Vec<LibraryScanTask>>(),
		);

		Ok(WorkingState {
			data: Some(LibraryScanData::default()),
			tasks,
			current_task_index: 0,
			errors: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		match task {
			LibraryScanTask::Init(input) => {
				unimplemented!()
			},
			LibraryScanTask::WalkSeries(path_buf) => {
				unimplemented!()
			},
		}
	}
}
