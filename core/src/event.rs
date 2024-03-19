use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	db::entity::CoreJobOutput,
	job::{JobUpdate, WorkerSend, WorkerSendExt},
};

/// An event that is emitted by the core and consumed by a client
#[derive(Clone, Serialize, Deserialize, Debug, Type)]
#[serde(tag = "__typename")]
pub enum CoreEvent {
	JobStarted(String),
	JobUpdate(JobUpdate),
	JobOutput { id: String, output: CoreJobOutput },
	DiscoveredMissingLibrary(String),
	CreatedMedia { id: String, series_id: String },
	CreatedManySeries { count: u64, library_id: String },
	CreatedOrUpdatedManyMedia { count: u64, series_id: String },
}

impl WorkerSendExt for CoreEvent {
	fn into_send(self) -> WorkerSend {
		WorkerSend::Event(self)
	}
}
