use serde::{de, Deserialize, Serialize};

mod error;
mod manager;
mod worker;

pub use error::*;
pub use manager::*;
pub use worker::*;

/// An enum that defines the actor that initiated a job (e.g. a user, another job, or the system)
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum JobInitActor {
	User(String),
	Job(String),
	System,
}

/// A trait that defines the state of a job. State is frequently updated during execution.
pub trait JobState: Serialize + de::DeserializeOwned {
	fn update(&mut self, updated: Self) {
		*self = updated;
	}
}

/// () is effectively a no-op state, which is useful for jobs that don't need to track state.
impl JobState for () {
	fn update(&mut self, _: Self) {
		// Do nothing
	}
}

// TODO: I'm not sure output should have both `data` and `metadata`, and the data is just
// the state... State will need to be mutable, which just complicates things...

pub struct JobOutput<S, M, E> {
	data: S,
	metadata: M,
	errors: Vec<E>,
}

#[async_trait::async_trait]
pub trait StatefulJob: Send + Sync + Sized {
	const NAME: &'static str;

	/// Internal state used by the job. This is updated during execution but not persisted.
	/// If pausing/resuming is implemented, this will be serialized and stored in the DB.
	type Data: JobState + Default;
	type Metadata: Serialize + de::DeserializeOwned;
	type Error: ToString;

	async fn run(
		&self,
	) -> Result<JobOutput<Self::Data, Self::Metadata, Self::Error>, JobError>;
}

// SCRATCHPAD BELOW!! Just used for testing the tentative job system design changes above...

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

impl JobState for LibraryScanJobState {}

#[derive(Serialize, Deserialize)]
struct LibraryScanJobMetadata {
	actor: JobInitActor,
}

#[async_trait::async_trait]
impl StatefulJob for LibraryScanJob {
	const NAME: &'static str = "library_scan";

	type Data = LibraryScanJobState;
	type Metadata = LibraryScanJobMetadata;
	type Error = String;

	async fn run(
		&self,
	) -> Result<JobOutput<Self::Data, Self::Metadata, Self::Error>, JobError> {
		unimplemented!()
	}
}
