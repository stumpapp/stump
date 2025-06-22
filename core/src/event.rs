use async_graphql::{SimpleObject, Union};
use serde::{Deserialize, Serialize};

use crate::job::{CoreJobOutput, JobUpdate, WorkerSend, WorkerSendExt};

#[derive(Clone, Serialize, Deserialize, Debug, SimpleObject)]
pub struct JobStarted {
	pub id: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, SimpleObject)]
pub struct JobOutput {
	pub id: String,
	pub output: CoreJobOutput,
}

#[derive(Clone, Serialize, Deserialize, Debug, SimpleObject)]
pub struct DiscoveredMissingLibrary {
	pub id: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct CreatedMedia {
	pub id: String,
	pub series_id: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct CreatedManySeries {
	pub count: u64,
	pub library_id: String,
}

#[derive(Clone, Serialize, Deserialize, Debug, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct CreatedOrUpdatedManyMedia {
	pub count: u64,
	pub series_id: String,
}

/// An event that is emitted by the core and consumed by a client
#[derive(Clone, Serialize, Deserialize, Debug, Union)]
#[serde(tag = "__typename")]
pub enum CoreEvent {
	JobStarted(JobStarted),
	JobUpdate(JobUpdate),
	JobOutput(JobOutput),
	DiscoveredMissingLibrary(DiscoveredMissingLibrary),
	CreatedMedia(CreatedMedia),
	CreatedManySeries(CreatedManySeries),
	CreatedOrUpdatedManyMedia(CreatedOrUpdatedManyMedia),
}

impl WorkerSendExt for CoreEvent {
	fn into_worker_send(self) -> WorkerSend {
		WorkerSend::Event(self)
	}
}
