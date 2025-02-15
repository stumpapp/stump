//! This module defines interfaces and utilities for fetching metadata from external sources.
//! Each source is implemented as a [`MetadataSource`], which provides metadata for a given
//! [`MetadataSourceInput`], which contains information about a media item to allow the
//! [`MetadataSource`] implementation to construct necessary queries
//!
//! # Key Interfaces
//!
//! - [`MetadataSourceInput`] carries information needed by a source (e.g., title, ISBN).
//! - [`MetadataOutput`] is the standardized result returned by any metadata source.
//! - [`MetadataSource`] is the trait that each metadata source implements.
//! - [`get_source_by_name`] maps a string (source name) to its corresponding trait object.
//! - [`REGISTERED_SOURCES`] holds the list of source implementation names, used to  
//!   signal which sources are available to the core crate.
//!
//! Errors emitted by this crate have type [`MetadataSourceError`].
//!
//! # Implementing [`MetadataSource`]
//!
//! Implementing a new metadata source can be done by the following steps:
//!
//! - Define a new module containing a 0-size struct which implements [`MetadataSource`]
//! - If the metadata source requires configuration, define a structure that implements
//!   [`schemars::JsonSchema`] and provide non-`None` values for [`MetadataSource::get_config_schema`]
//!   and [`MetadataSource::get_default_config`].
//! - Set a name for the source. By implementing [`MetadataSource::name`] and adding the **same name**
//!   to the [`REGISTERED_SOURCES`] constant.
//!

mod config_schema;
mod filename_parser;
mod sources;

use thiserror::Error;

pub use config_schema::{ConfigSchema, SchemaField, SchemaFieldType};
use sources::*;

/// A constant containing a list of source identities for implementations of [`MetadataSource`].
/// A source's identity must be inlcuded here or it will not be written to the database to be
/// enabled/disabled by a user.
pub const REGISTERED_SOURCES: &[&str] = &[
	open_library::SOURCE_NAME,
	google_books::SOURCE_NAME,
	comicvine::SOURCE_NAME,
	hardcover::SOURCE_NAME,
];

/// Information provided to a [`MetadataSource`] implementation to locate the correct metadata.
///
/// All inputs are optional and need not be used by source implementations. Source implementations
/// are expected to return a [`MetadataSourceError::IncompatibleInput`] error if a necessary field
/// is available and callers of metadata sources should handle such an error gracefully when the
/// source API being used is not known.
#[derive(Default)]
pub struct MetadataSourceInput {
	/// The title of the input.
	pub title: Option<String>,
	/// The name of the series that the input is part of.
	pub series: Option<String>,
	/// The authors of the input, if known.
	pub author: Vec<String>,
	/// The number in the series that the input is part of.
	pub number: Option<u32>,
	/// The ISBN of the input book, if any.
	pub isbn: Option<String>,
	/// The publisher of the input book.
	pub publisher: Option<String>,
}

/// This trait defines a metadata source which includes logic for fetching metadata for a given
/// [`MetadataSourceInput`].
#[async_trait::async_trait]
pub trait MetadataSource {
	/// The `const &str` used to identify a particular metadata source
	fn name(&self) -> &'static str;

	/// Makes a request for metadata object the implemented source logic and returns
	/// the normalized [`MetadataOutput`] produced by the implementation.
	///
	/// Errors are expected when calling this function on a collection of [`MetadataSource`]
	/// implementations. Sources will return [`MetadataSourceError::IncompatibleInput`] if
	/// the input is not sufficient to construct a request for the API backing them. This
	/// error must be handled gracefully by the caller.
	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
		config: &Option<String>,
	) -> Result<Vec<MetadataOutput>, MetadataSourceError>;

	/// Returns an optional [`ConfigSchema`] describing the JSON config structure for this source.
	///
	/// Implementations that require configuration (like an API key) should provide a schema that
	/// the front-end can use to render input fields dynamically. Sources that do not need
	/// configuration can return `None`.
	///
	/// The frontend is expected to use this schema to render a UI for setting the configuration
	/// values for the source.
	fn get_config_schema(&self) -> Option<ConfigSchema>;

	/// Returns an optional default configuration in JSON form.
	///
	/// If [`MetadataSource::get_config_schema`] is implemented, returning a default config as JSON
	/// is required so that the database can initialize an entry for the [`MetadataSource`].
	fn get_default_config(&self) -> Option<String>;
}

/// A struct that holds the [`MetadataSource`] output.
#[derive(Debug, Default)]
pub struct MetadataOutput {
	pub title: Option<String>,
	pub authors: Vec<String>,
	pub description: Option<String>,
	pub published: Option<String>,
}

/// Fetches a [`MetadataSource`] trait object by its identifier. Returns an error if the name
/// does not match one implemented below.
///
/// This function **must** be updated whenever a new [`MetadataSource`] implementation is added.
pub fn get_source_by_name(
	name: &str,
) -> Result<Box<dyn MetadataSource>, MetadataSourceError> {
	match name {
		open_library::SOURCE_NAME => Ok(Box::new(open_library::OpenLibrarySource)),
		google_books::SOURCE_NAME => Ok(Box::new(google_books::GoogleBooksSource)),
		comicvine::SOURCE_NAME => Ok(Box::new(comicvine::ComicVineSource)),
		hardcover::SOURCE_NAME => Ok(Box::new(hardcover::HardcoverSource)),
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
	#[error("Config error: {0}")]
	ConfigError(String),
	#[error("Input incompatibility: {0}")]
	IncompatibleInput(String),
	#[error("Metadata source response error: {0}")]
	ResponseError(String),
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
			title: Some("Dune".to_string()),
			..Default::default()
		};

		for source in &sources {
			let out = source.get_metadata(&test_input, &None).await.unwrap();
			outputs.push(out);
		}
	}
}
