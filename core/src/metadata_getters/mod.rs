mod open_library;

use thiserror::Error;

use crate::db::entity::Media;

pub mod sources {
	pub use super::open_library::OpenLibrarySource;
}

/// This trait defines a metadata source by which metadata for [`Media`] can be obtained.
#[async_trait::async_trait]
pub trait MetadataSource {
	/// Makes a request for a [`Media`] object using the implemented source logic and returns
	/// the normalized output.
	async fn get_metadata(
		&self,
		media: &Media,
	) -> Result<MetadataOutput, MetadataIntegrationError>;
}

/// A struct that holds the [`MetadataSource`] output.
#[derive(Debug, Default)]
pub struct MetadataOutput {
	pub title: Option<String>,
	pub author: Option<String>,
}

#[derive(Debug, Error)]
pub enum MetadataIntegrationError {
	#[error("Reqwest error: {0}")]
	ReqwestError(#[from] reqwest::Error),
	#[error("Error deserializing JSON: {0}")]
	SerdeJsonError(#[from] serde_json::Error),
}

#[cfg(test)]
mod tests {
	use super::{sources::OpenLibrarySource, *};

	#[tokio::test]
	async fn dev_test() {
		let mut outputs = Vec::new();
		let sources: Vec<Box<dyn MetadataSource>> = vec![Box::new(OpenLibrarySource)];

		let test_media = Media {
			name: "Dune".to_string(),
			..Media::default()
		};

		for source in &sources {
			let out = source.get_metadata(&test_media).await.unwrap();
			outputs.push(out);
		}
	}
}
