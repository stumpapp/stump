mod open_library;

use thiserror::Error;

use crate::db::entity::Media;

pub mod sources {
	pub use super::open_library::OpenLibrarySource;
}

/// This trait defines a metadata source by which metadata for [`Media`] can be obtained.
#[async_trait::async_trait]
pub trait MetadataSource {
	/// The `const &str` used to identify a particular metadata source
	fn identifier(&self) -> &'static str;

	/// Makes a request for a [`Media`] object using the implemented source logic and returns
	/// the normalized output.
	async fn get_metadata(
		&self,
		media: &Media,
	) -> Result<MetadataOutput, MetadataSourceError>;
}

/// A struct that holds the [`MetadataSource`] output.
#[derive(Debug, Default)]
pub struct MetadataOutput {
	pub title: Option<String>,
	pub author: Option<String>,
}

pub fn get_source_by_name(
	name: &str,
) -> Result<Box<dyn MetadataSource>, MetadataSourceError> {
	match name {
		open_library::SOURCE_IDENTIFIER => Ok(Box::new(open_library::OpenLibrarySource)),
		_ => Err(MetadataSourceError::InvalidName(name.to_string())),
	}
}

#[derive(Debug, Error)]
pub enum MetadataSourceError {
	#[error("Invalid metadata source name: {0}")]
	InvalidName(String),
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
