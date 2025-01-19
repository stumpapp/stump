mod open_library;

use thiserror::Error;

use crate::db::entity::Media;

pub mod sources {
	pub use super::open_library::OpenLibrarySource;
}

/// TODO - Document
pub trait MetadataSource {
	// TODO - Consider not using async
	/// Makes a request for a [`Media`] object using the implemented source logic and returns
	/// the normalized output.
	async fn get_metadata(
		media: &Media,
	) -> Result<MetadataOutput, MetadataIntegrationError>;
}

/// A struct that holds the [`MetadataSource`] output.
#[derive(Debug, Default)]
pub struct MetadataOutput {
	title: Option<String>,
	author: Option<String>,
}

#[derive(Debug, Error)]
pub enum MetadataIntegrationError {
	#[error("Reqwest error: {0}")]
	ReqwestError(#[from] reqwest::Error),
	#[error("Error deserializing JSON: {0}")]
	SerdeJsonError(#[from] serde_json::Error),
}
