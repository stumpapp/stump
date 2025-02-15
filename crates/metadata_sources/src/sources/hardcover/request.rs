use crate::{MetadataSourceError, MetadataSourceInput};
use reqwest::{Client, RequestBuilder};

/// The base url used to access the Hardcover API.
const BASE_URL: &str = "https://api.hardcover.app/v1/graphql";

pub fn build_request(
	request_client: &Client,
	input: &MetadataSourceInput,
	api_key: String,
	max_result_count: u32,
) -> Result<RequestBuilder, MetadataSourceError> {
	// Build query
	let query;
	if let Some(title) = input.title.clone() {
		// from title
		query = serde_json::json!({
		"query": format!("query Search {{ search(query: \"{title}\", query_type: \"Book\", per_page: {max_result_count}, page: 1 ) {{results}}}}")
		});
	} else if let Some(isbn) = input.isbn.clone() {
		// from isbn
		query = serde_json::json!({
		"query": format!("query Search {{ search(query: \"{isbn}\", query_type: \"Book\", per_page: {max_result_count}, page: 1 ) {{results}}}}")
		});
	} else {
		return Err(MetadataSourceError::IncompatibleInput(
			"missing title and / or isbn".to_string(),
		));
	}

	// Build request
	Ok(request_client
		.post(BASE_URL)
		.header("Content-Type", "application/json")
		.header("authorization", api_key)
		.json(&query))
}
