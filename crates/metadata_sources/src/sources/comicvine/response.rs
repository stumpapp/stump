use serde::Deserialize;

/// Top-level ComicVine search response structure.
/// Adapt fields to the actual ComicVine API shape you need.
#[derive(Debug, Deserialize)]
pub struct ComicVineSearchResponse {
	pub status_code: i32,
	pub results: Option<Vec<ComicVineSearchResult>>,
}

#[derive(Debug, Deserialize)]
pub struct ComicVineSearchResult {
	/// The "name" field from ComicVine (e.g., a volume name, an issue name, etc.)
	pub name: Option<String>,
	// TODO - Check this
	/// A short summary—ComicVine often calls it "deck".
	pub deck: Option<String>,
	/// A longer description—sometimes HTML.
	pub description: Option<String>,
	// TODO - Other stuff to include?
}
