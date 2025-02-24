use crate::MetadataSourceInput;

/// The base url used to access the Google Books API.
const BASE_URL: &str = "https://www.googleapis.com/books/v1/volumes";

pub fn build_request_url(
	input: &MetadataSourceInput,
	api_key: &str,
	max_result_count: u32,
) -> String {
	// Build up query parameters
	let mut query_parts = Vec::new();

	// First the search query part
	query_parts.push(build_q_params(input));
	// Then we add the other query params in
	query_parts.push(format!("maxResults={max_result_count}"));
	query_parts.push("projection=lite".to_string());
	query_parts.push("orderBy=relevance".to_string());
	query_parts.push(format!("key={api_key}"));

	let query_params = query_parts.join("&");
	format!("{BASE_URL}?{query_params}")
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
		q_param_parts.push(format!("inpublisher:{publisher}"));
	}

	format!("q={}", q_param_parts.join("+"))
}
