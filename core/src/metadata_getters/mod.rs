mod open_library;

use std::collections::HashSet;

use thiserror::Error;

use crate::{db::entity::Media, prisma};

/// A constant containing a list of source identities for implementations of [`MetadataSource`].
/// A source's identity must be inlcuded here or it will not be written to the database to be
/// enabled/disabled by a user.
const SOURCE_LIST: &[&str] = &[open_library::SOURCE_IDENTIFIER];

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

/// Fetches a [`MetadataSource`] trait object by its identifier. Returns an error if the name
/// does not match one implemented below.
///
/// This function must be updated whenever a new [`MetadataSource`] implementation is added.
pub fn get_source_by_name(
	name: &str,
) -> Result<Box<dyn MetadataSource>, MetadataSourceError> {
	match name {
		open_library::SOURCE_IDENTIFIER => Ok(Box::new(open_library::OpenLibrarySource)),
		_ => Err(MetadataSourceError::InvalidName(name.to_string())),
	}
}

/// Set up the database entries for metadata sources. This function will ensure that each
/// of the sources listed in [`SOURCE_LIST`] are included in the database, adding any that
/// are missing and enabling them by default.
///
/// A source which no longer has an implementation may still be present in the database as
/// currently implemented, but will return an error when used to fetch the associated
/// [`MetadataSource`] implementation using [`get_source_by_name`].
pub(crate) async fn run_startup_process(
	client: &prisma::PrismaClient,
) -> Result<(), MetadataSourceError> {
	let db_sources = client.metadata_source().find_many(vec![]).exec().await?;
	let existing_identities: HashSet<&str> =
		db_sources.iter().map(|s| s.id.as_str()).collect();

	// Determine missing entries
	let missing: Vec<_> = SOURCE_LIST
		.iter()
		.filter_map(|source| {
			if !existing_identities.contains(source) {
				// (Id, enabled, set_params)
				// By default, new sources are enabled
				Some((source.to_string(), true, vec![]))
			} else {
				// No need to create existing sources
				None
			}
		})
		.collect();
	// Create them if necessary
	if !missing.is_empty() {
		client.metadata_source().create_many(missing).exec().await?;
	}

	Ok(())
}

#[derive(Debug, Error)]
pub enum MetadataSourceError {
	#[error("Invalid metadata source name: {0}")]
	InvalidName(String),
	#[error("Reqwest error: {0}")]
	ReqwestError(#[from] reqwest::Error),
	#[error("Error deserializing JSON: {0}")]
	SerdeJsonError(#[from] serde_json::Error),
	#[error("Prisma query error: {0}")]
	QueryError(#[from] Box<prisma_client_rust::QueryError>),
}

impl From<prisma_client_rust::QueryError> for MetadataSourceError {
	fn from(error: prisma_client_rust::QueryError) -> Self {
		Self::QueryError(Box::new(error))
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let mut outputs = Vec::new();
		let sources: Vec<Box<dyn MetadataSource>> =
			vec![Box::new(open_library::OpenLibrarySource)];

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
