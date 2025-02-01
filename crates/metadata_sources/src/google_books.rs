//! This module contains the [Google Books](https://developers.google.com/books) implementation of
//! the [`MetadataSource`] trait.

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::ConfigSchema;

use super::{MetadataOutput, MetadataSource, MetadataSourceError, MetadataSourceInput};

/// The name used to identify the source in the database, retrieve the [`MetadataSource`]
/// implementation, and displayed to the user in the UI.
pub const SOURCE_NAME: &str = "Google Books";

/// The base url used to access the Google Books API
const BASE_URL: &str = "https://www.googleapis.com/books/v1/volumes";

/// Implements metadata retrieval using the Google Books API.
pub struct GoogleBooksSource;

#[derive(Deserialize, Serialize, JsonSchema, Default)]
pub struct GoogleBooksConfig {
	api_key: Option<String>,
}

#[derive(Deserialize)]
struct GoogleBooksResponse {
	items: Option<Vec<GoogleBooksVolume>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleBooksVolume {
	volume_info: GoogleBooksVolumeInfo,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleBooksVolumeInfo {
	title: Option<String>,
	authors: Option<Vec<String>>,
	description: Option<String>,
	published_date: Option<String>,
}

#[async_trait::async_trait]
impl MetadataSource for GoogleBooksSource {
	fn name(&self) -> &'static str {
		SOURCE_NAME
	}

	async fn get_metadata(
		&self,
		input: &MetadataSourceInput,
		config: &Option<String>,
	) -> Result<MetadataOutput, MetadataSourceError> {
		// Parse config JSON or error
		let config: GoogleBooksConfig = if let Some(cfg_json) = config {
			serde_json::from_str(cfg_json)?
		} else {
			return Err(MetadataSourceError::ConfigError(
				"No Google Books config provided".to_string(),
			));
		};
		// We can't proceed without an api key
		let Some(api_key) = config.api_key else {
			return Err(MetadataSourceError::ConfigError(
				"An API key is necessary to use the Google Books metadata source"
					.to_string(),
			));
		};

		// Make the request
		let url = build_request_url(input, api_key)?;
		let response = reqwest::get(url)
			.await?
			.json::<GoogleBooksResponse>()
			.await?;

		// Use the response to fill MetadataOutput
		if let Some(items) = response.items {
			if let Some(first_item) = items.into_iter().next() {
				let info = first_item.volume_info;
				return Ok(MetadataOutput {
					title: info.title,
					authors: info.authors.unwrap_or_default(),
					description: info.description,
					published: info.published_date,
				});
			}
		}

		// Return an error if the response was empty
		return Err(MetadataSourceError::ResponseError(
			"Google Books response contained no items".to_string(),
		));
	}

	fn get_config_schema(&self) -> Option<ConfigSchema> {
		Some(ConfigSchema::from(schemars::schema_for!(GoogleBooksConfig)))
	}

	fn get_default_config(&self) -> Option<String> {
		Some(
			serde_json::to_string(&GoogleBooksConfig::default())
				.expect("GoogleBooksConfig should be serializable"),
		)
	}
}

fn build_request_url(
	input: &MetadataSourceInput,
	api_key: String,
) -> Result<String, MetadataSourceError> {
	// Build up query parameters
	let mut query_parts = Vec::new();

	// First the search query part
	query_parts.push(build_q_params(input));
	// Then we add the other query params in
	query_parts.push("maxResults=10".to_string());
	query_parts.push("projection=lite".to_string());
	query_parts.push("orderBy=relevance".to_string());
	query_parts.push(format!("key={api_key}"));

	let query_params = query_parts.join("&");
	Ok(format!("{BASE_URL}?{query_params}"))
}

/// Construct the search query params for a Google books query. For example, consider
/// the URL: `https://www.googleapis.com/books/v1/volumes?q=intitle:flowers+inauthor:keyes`
///
/// This function builds the `q=intitle:flowers+inauthor:keyes` part of the request.
fn build_q_params(input: &MetadataSourceInput) -> String {
	let mut q_param_parts = Vec::new();
	// Query by title
	if let Some(title) = &input.title {
		let title = title.trim();
		q_param_parts.push(format!("intitle:{title}"));
	}
	// Query by ISBN
	if let Some(isbn) = &input.isbn {
		let isbn = isbn.trim();
		q_param_parts.push(format!("isbn:{isbn}"));
	}
	// Query by publisher
	if let Some(publisher) = &input.publisher {
		let publisher = publisher.trim();
		q_param_parts.push(format!("inpublisher:{publisher}"))
	}

	format!("q={}", q_param_parts.join("+"))
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

		let test_config = r#"{ "api_key": "_" }"#.to_string();

		let metadata_output = source
			.get_metadata(&test_input, &Some(test_config))
			.await
			.unwrap();
		assert_eq!(metadata_output.title.unwrap(), "Dune");
	}
}
