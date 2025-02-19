//! This module contains the [ComicVine](https://comicvine.gamespot.com/api/documentation) implementation of
//! the [`MetadataSource`] trait.

mod request;
mod response;

use request::build_request_url;
use response::ComicVineSearchResponse;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
	ConfigSchema, MetadataOutput, MetadataSource, MetadataSourceError,
	MetadataSourceInput,
};

/// The name used to identify the source in the database, retrieve the [`MetadataSource`]
/// implementation, and displayed to the user in the UI.
pub const SOURCE_NAME: &str = "ComicVine";

#[derive(Debug, Deserialize, Serialize, JsonSchema, Default)]
pub struct ComicVineConfig {
	api_key: Option<String>,
}

/// Implements metadata retrieval using the ComicVine API.
pub struct ComicVineSource;

#[async_trait::async_trait]
impl MetadataSource for ComicVineSource {
	fn name(&self) -> &'static str {
		SOURCE_NAME
	}

	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
		config: &Option<String>,
	) -> Result<Vec<MetadataOutput>, MetadataSourceError> {
		// Parse config JSON or error
		let config: ComicVineConfig = if let Some(cfg_json) = config {
			serde_json::from_str(cfg_json)?
		} else {
			return Err(MetadataSourceError::ConfigError(
				"No ComicVine config provided.".to_string(),
			));
		};

		// We can't proceed without an API key
		let Some(api_key) = config.api_key else {
			return Err(MetadataSourceError::ConfigError(
				"An API key is required to use the ComicVine metadata source."
					.to_string(),
			));
		};

		// Perform the request
		let url = build_request_url(input, api_key)?;
		let response = reqwest::get(url)
			.await?
			.json::<ComicVineSearchResponse>()
			.await?;

		// TODO - Make sure this is the best approach
		// Check the response status
		if response.status_code != 1 {
			return Err(MetadataSourceError::ResponseError(format!(
				"ComicVine returned a non-successful status_code: {}",
				response.status_code
			)));
		}

		// TODO - Adjust further
		// Convert response items into MetadataOutput
		if let Some(results) = response.results {
			if !results.is_empty() {
				let metadata_outputs: Vec<MetadataOutput> = results
					.into_iter()
					.map(|item: response::ComicVineSearchResult| MetadataOutput {
						title: item.name,
						authors: vec![],
						description: item.deck.or(item.description),
						published: None,
					})
					.collect();
				return Ok(metadata_outputs);
			}
		}

		// Return an error if the response was empty
		Err(MetadataSourceError::ResponseError(
			"ComicVine response contained no results.".to_string(),
		))
	}

	fn get_config_schema(&self) -> Option<ConfigSchema> {
		Some(ConfigSchema::from(schemars::schema_for!(ComicVineConfig)))
	}

	fn get_default_config(&self) -> Option<String> {
		Some(
			serde_json::to_string(&ComicVineConfig::default())
				.expect("ComicVineConfig should be serializable."),
		)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test]
	async fn dev_test() {
		let source = ComicVineSource;

		// Example: searching for "Batman"
		let test_input = MetadataSourceInput {
			title: Some("Batman".to_string()),
			..Default::default()
		};

		let api_key = crate::tests::get_secret("COMICVINE_API_KEY");
		let test_config = format!("{{ \"api_key\": \"{api_key}\" }}");

		// Attempt to fetch metadata
		let result = source.get_metadata(&test_input, &Some(test_config)).await;

		// TODO - Finish test
		match result {
			Ok(metadata) => {
				println!("Got metadata: {:?}", metadata);
			},
			Err(e) => {
				eprintln!("Error: {:?}", e);
			},
		}
	}
}
