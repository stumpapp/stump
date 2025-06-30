use std::fmt::Debug;

use async_graphql::{SimpleObject, Union};
use serde::{de, Deserialize, Serialize};

use crate::filesystem::{
	image::ThumbnailGenerationOutput,
	scanner::{LibraryScanOutput, SeriesScanOutput},
};

// TODO: There are a couple jobs defined in the server, which obviously presents a problem with
// this type. For now, I'll do some type gymnastics to make it work, but it's not ideal and
// should be fixed. In the meantime, this type represents a generic object
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct ExternalJobOutput {
	pub val: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Union)]
#[serde(untagged, rename_all = "camelCase")]
pub enum CoreJobOutput {
	LibraryScan(LibraryScanOutput),
	SeriesScan(SeriesScanOutput),
	ThumbnailGeneration(ThumbnailGenerationOutput),
	External(ExternalJobOutput),
}

/// A trait to extend the output type for a job with a common interface. Job output starts
/// in an 'empty' state (Default) and is frequently updated during execution.
///
/// The state is also serialized and stored in the DB, so it must implement [Serialize] and [`de::DeserializeOwned`].
pub trait JobOutputExt: Serialize + de::DeserializeOwned + Debug {
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
