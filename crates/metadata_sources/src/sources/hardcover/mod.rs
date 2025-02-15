//! This module contains the [Hardcover](https://docs.hardcover.app/) implementation of
//! the [`MetadataSource`] trait.

mod request;
mod response;

use request::build_request;
use response::HardcoverResponse;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
	ConfigSchema, MetadataOutput, MetadataSource, MetadataSourceError,
	MetadataSourceInput,
};

/// The name used to identify the source in the database, retrieve the [`MetadataSource`]
/// implementation, and displayed to the user in the UI.
pub const SOURCE_NAME: &str = "Hardcover";

#[derive(Debug, Deserialize, Serialize, JsonSchema)]
#[serde(default)]
pub struct HardcoverConfig {
	api_key: Option<String>,
	max_result_count: u32,
}

impl Default for HardcoverConfig {
	fn default() -> Self {
		Self {
			api_key: Default::default(),
			max_result_count: 10,
		}
	}
}

/// Implements metadata retrieval using the Hardcover API.
pub struct HardcoverSource;

#[async_trait::async_trait]
impl MetadataSource for HardcoverSource {
	fn name(&self) -> &'static str {
		SOURCE_NAME
	}

	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
		config: &Option<String>,
	) -> Result<Vec<MetadataOutput>, MetadataSourceError> {
		// Parse config JSON or error
		let config: HardcoverConfig = if let Some(cfg_json) = config {
			serde_json::from_str(cfg_json)?
		} else {
			return Err(MetadataSourceError::ConfigError(
				"No Hardcover config provided.".to_string(),
			));
		};

		// We can't proceed without an api key
		let Some(api_key) = config.api_key else {
			return Err(MetadataSourceError::ConfigError(
				"An API key is necessary to use the Hardcover metadata source."
					.to_string(),
			));
		};

		// Make the request
		let client = reqwest::Client::new();
		let request = build_request(&client, input, api_key, config.max_result_count)?;
		let response = request.send().await?.json::<HardcoverResponse>().await?;

		// TODO - Remove
		println!("{response:?}");

		// Convert response items into MetadataOutput
		if let Some(items) = response.data.search.results.hits {
			if !items.is_empty() {
				let metadata_outputs: Vec<MetadataOutput> = items
					.into_iter()
					.map(|item: response::Hit| MetadataOutput {
						title: item.document.title,
						authors: item.document.author_names,
						description: item.document.description,
						published: item.document.release_date,
					})
					.collect();
				return Ok(metadata_outputs);
			}
		}

		// Return an error if response.items was None or empty
		return Err(MetadataSourceError::ResponseError(
			"Hardcover response contained no items.".to_string(),
		));
	}

	fn get_config_schema(&self) -> Option<ConfigSchema> {
		Some(ConfigSchema::from(schemars::schema_for!(HardcoverConfig)))
	}

	fn get_default_config(&self) -> Option<String> {
		Some(
			serde_json::to_string(&HardcoverConfig::default())
				.expect("HardcoverConfig should be serializable."),
		)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	const API_KEY: &str = "_";

	#[tokio::test]
	async fn title_test() {
		let source = HardcoverSource;

		let test_input = MetadataSourceInput {
			title: Some("Dune".to_string()),
			..Default::default()
		};

		let test_config = format!("{{ \"api_key\": \"{API_KEY}\" }}").to_string();

		let metadata_output = source
			.get_metadata(&test_input, &Some(test_config))
			.await
			.unwrap();
		let first_metadata = metadata_output
			.first()
			.expect("Expected at least one metadata entry");

		assert_eq!(first_metadata.title.as_deref(), Some("Dune"));
	}

	#[tokio::test]
	async fn isbn_test() {
		let source = HardcoverSource;

		let test_input = MetadataSourceInput {
			isbn: Some("9780425027066".to_string()),
			..Default::default()
		};

		let test_config = format!("{{ \"api_key\": \"{API_KEY}\" }}").to_string();

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
