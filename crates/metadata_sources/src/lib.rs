mod open_library;

use thiserror::Error;

/// A constant containing a list of source identities for implementations of [`MetadataSource`].
/// A source's identity must be inlcuded here or it will not be written to the database to be
/// enabled/disabled by a user.
pub const REGISTERED_SOURCES: &[&str] = &[open_library::SOURCE_NAME];

pub struct MetadataSourceInput {
	pub name: String,
}

/// This trait defines a metadata source by which metadata for [`Media`] can be obtained.
#[async_trait::async_trait]
pub trait MetadataSource {
	/// The `const &str` used to identify a particular metadata source
	fn name(&self) -> &'static str;

	/// Makes a request for a [`Media`] object using the implemented source logic and returns
	/// the normalized output.
	async fn get_metadata(
		&self,
		media: &MetadataSourceInput,
	) -> Result<MetadataOutput, MetadataSourceError>;
}

/// A struct that holds the [`MetadataSource`] output.
#[derive(Debug, Default)]
pub struct MetadataOutput {
	pub title: Option<String>,
	pub author: Option<String>,
}

/// Fetches a [`MetadataSource`] trait object by its identifier. Returns an error if the name
/// does not match one implemented below.
///
/// This function must be updated whenever a new [`MetadataSource`] implementation is added.
pub fn get_source_by_name(
	name: &str,
) -> Result<Box<dyn MetadataSource>, MetadataSourceError> {
	match name {
		open_library::SOURCE_NAME => Ok(Box::new(open_library::OpenLibrarySource)),
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
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let mut outputs = Vec::new();
		let sources: Vec<Box<dyn MetadataSource>> =
			vec![Box::new(open_library::OpenLibrarySource)];

		let test_input = MetadataSourceInput {
			name: "Dune".to_string(),
		};

		for source in &sources {
			let out = source.get_metadata(&test_input).await.unwrap();
			outputs.push(out);
		}
	}
}
