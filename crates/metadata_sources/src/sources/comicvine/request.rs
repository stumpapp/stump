use crate::MetadataSourceInput;

/// The base URL used to access the ComicVine API search endpoint.
const BASE_URL: &str = "https://comicvine.gamespot.com/api/search";

pub fn build_request_url(input: &MetadataSourceInput, api_key: &str) -> String {
	// Build up query parameters
	let mut query_parts = Vec::new();

	// Format: `api_key=XXX&format=json&resources=issue&query=Batman`
	query_parts.push(format!("api_key={api_key}"));
	query_parts.push("format=json".to_string());
	query_parts.push("resources=issue".to_string());
	query_parts.push(build_query_param(input));
	// Limit how many results we want
	query_parts.push("limit=10".to_string());

	let query_params = query_parts.join("&");
	format!("{BASE_URL}?{query_params}")
}

/// Construct the `query` parameter for a ComicVine search.
/// We simply combine title, ISBN, publisher, etc. into a single search string.
fn build_query_param(input: &MetadataSourceInput) -> String {
	let mut query_fragments = Vec::new();

	if let Some(title) = &input.title {
		let title = title.trim();
		query_fragments.push(title.to_string());
	}

	// ISBN not supported, though it is commonly requested on ComicVine API dev forum.

	if let Some(publisher) = &input.publisher {
		let publisher = publisher.trim();
		query_fragments.push(publisher.to_string());
	}

	// If empty, fall back to a blank query
	let combined_query = if query_fragments.is_empty() {
		String::new()
	} else {
		// Join with spaces so ComicVine sees them as separate keywords
		query_fragments.join(" ")
	};

	format!("query={combined_query}")
}
