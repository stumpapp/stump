//! This module contains the [Google Books](https://developers.google.com/books) implementation of
//! the [`MetadataSource`] trait.

mod request;
mod response;

use request::build_request_url;
use response::GoogleBooksResponse;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
	ConfigSchema, MetadataOutput, MetadataSource, MetadataSourceError,
	MetadataSourceInput,
};

/// The name used to identify the source in the database, retrieve the [`MetadataSource`]
/// implementation, and displayed to the user in the UI.
pub const SOURCE_NAME: &str = "Google Books";

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
pub struct GoogleBooksConfig {
	api_key: Option<String>,
	max_result_count: u32,
}

impl Default for GoogleBooksConfig {
	fn default() -> Self {
		Self {
			api_key: Default::default(),
			max_result_count: 10,
		}
	}
}

/// Implements metadata retrieval using the Google Books API.
pub struct GoogleBooksSource;

#[async_trait::async_trait]
impl MetadataSource for GoogleBooksSource {
	fn name(&self) -> &'static str {
		SOURCE_NAME
	}

	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
		config: &Option<String>,
	) -> Result<Vec<MetadataOutput>, MetadataSourceError> {
		// Parse config JSON or error
		let config: GoogleBooksConfig = if let Some(cfg_json) = config {
			serde_json::from_str(cfg_json)?
		} else {
			return Err(MetadataSourceError::ConfigError(
				"No Google Books config provided.".to_string(),
			));
		};

		// We can't proceed without an api key
		let Some(api_key) = config.api_key else {
			return Err(MetadataSourceError::ConfigError(
				"An API key is necessary to use the Google Books metadata source."
					.to_string(),
			));
		};

		// Make the request
		let url = build_request_url(input, api_key, config.max_result_count)?;
		let response = reqwest::get(url)
			.await?
			.json::<GoogleBooksResponse>()
			.await?;

		// TODO - Remove
		println!("{response:?}");

		// Convert response items into MetadataOutput
		if let Some(items) = response.items {
			if !items.is_empty() {
				let metadata_outputs: Vec<MetadataOutput> = items
					.into_iter()
					.map(|item: response::GoogleBooksVolume| MetadataOutput {
						title: item.volume_info.title,
						authors: item.volume_info.authors.unwrap_or_default(),
						description: item.volume_info.description,
						published: item.volume_info.published_date,
					})
					.collect();
				return Ok(metadata_outputs);
			}
		}

		// Return an error if response.items was None or empty
		return Err(MetadataSourceError::ResponseError(
			"Google Books response contained no items.".to_string(),
		));
	}

	fn get_config_schema(&self) -> Option<ConfigSchema> {
		Some(ConfigSchema::from(schemars::schema_for!(GoogleBooksConfig)))
	}

	fn get_default_config(&self) -> Option<String> {
		Some(
			serde_json::to_string(&GoogleBooksConfig::default())
				.expect("GoogleBooksConfig should be serializable."),
		)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let source = GoogleBooksSource;

		let test_input = MetadataSourceInput {
			title: Some("Dune".to_string()),
			isbn: Some("9780425027066".to_string()),
			..Default::default()
		};

		let test_config = r#"{
				"api_key": "_"
			}"#
		.to_string();

		let metadata_output = source
			.get_metadata(&test_input, &Some(test_config))
			.await
			.unwrap();
		let first_metadata = metadata_output
			.first()
			.expect("Expected at least one metadata entry");

		assert_eq!(first_metadata.title.as_deref(), Some("Dune"));
	}
}
