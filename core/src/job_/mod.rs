use std::{collections::VecDeque, path::PathBuf};

use globset::GlobSet;
use serde::{de, Deserialize, Serialize};

mod error;
mod manager;
mod worker;

pub use error::*;
pub use manager::*;
pub use worker::*;

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
pub trait MutableState: Serialize + de::DeserializeOwned {
	fn store(&mut self, updated: Self) {
		*self = updated;
	}
}

/// () is effectively a no-op state, which is useful for jobs that don't need to track state.
impl MutableState for () {
	fn store(&mut self, _: Self) {
		// Do nothing
	}
}

pub struct JobOutput<S, O, E> {
	pub state: S,
	pub output: O,
	pub errors: Vec<E>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct WorkingState<T> {
	tasks: VecDeque<T>,
	errors: Vec<String>,
}

#[async_trait::async_trait]
pub trait StatefulJob: Send + Sync + Sized {
	const NAME: &'static str;

	/// Internal state used by the job. This is updated during execution but not persisted.
	/// If pausing/resuming is implemented, this will be serialized and stored in the DB.
	type State: MutableState + Default;
	type Output: Serialize + de::DeserializeOwned;
	type Task: Serialize + de::DeserializeOwned;
	type Error: ToString;

	/// A function that should be called in Self::init to initialize the job state with
	/// existing data from the DB (if any). Used to support pausing/resuming jobs.
	async fn attempt_restore(
		&self,
		ctx: &WorkerCtx,
	) -> Result<Option<WorkingState<Self::Task>>, JobError> {
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
	async fn init(&self, ctx: &WorkerCtx) -> Result<WorkingState<Self::Task>, JobError>;

	/// A function that is called to start the actual job execution. This function should
	/// call self::init to create or restore the job state, and then execute the tasks
	#[must_use("Self::init must be called before Self::run")]
	async fn run(
		&self,
		data: Self::State,
		tasks: WorkingState<Self::Task>,
	) -> Result<JobOutput<Self::State, Self::Output, Self::Error>, JobError>;
}

// SCRATCHPAD BELOW!! Just used for testing the tentative job system design changes above...

#[derive(Serialize, Deserialize)]
enum LibraryScanJobTask {
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
struct LibraryScanJobState {
	/// The number of files to scan relative to the library root
	total_files: u64,

	created_media: u64,
	updated_media: u64,

	created_series: u64,
	updated_series: u64,
}

impl MutableState for LibraryScanJobState {}

#[derive(Serialize, Deserialize)]
struct LibraryScanJobOutput {}

#[async_trait::async_trait]
impl StatefulJob for LibraryScanJob {
	const NAME: &'static str = "library_scan";

	type State = LibraryScanJobState;
	type Output = LibraryScanJobOutput;
	type Task = LibraryScanJobTask;
	type Error = String;

	async fn init(&self, ctx: &WorkerCtx) -> Result<WorkingState<Self::Task>, JobError> {
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
			.map(LibraryScanJobTask::WalkSeries)
			.chain(
				series_to_create
					.into_iter()
					.map(LibraryScanJobTask::WalkSeries),
			)
			.collect::<Vec<LibraryScanJobTask>>();

		let tasks = VecDeque::from(
			[LibraryScanJobTask::Init(init_task_input)]
				.into_iter()
				.chain(series_to_visit)
				.collect::<Vec<LibraryScanJobTask>>(),
		);

		Ok(WorkingState {
			tasks,
			errors: vec![],
		})
	}

	async fn run(
		&self,
		data: Self::State,
		tasks: WorkingState<Self::Task>,
	) -> Result<JobOutput<Self::State, Self::Output, Self::Error>, JobError> {
		let WorkingState { mut tasks, .. } = tasks;
		while let Some(task) = tasks.pop_front() {
			let task_output = match task {
				LibraryScanJobTask::Init(input) => {},
				LibraryScanJobTask::WalkSeries(path) => {},
			};
		}

		unimplemented!()
	}
}
