use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct HardcoverResponse {
	pub data: SearchData,
}

#[derive(Debug, Deserialize)]
pub struct SearchData {
	pub search: SearchResults,
}

#[derive(Debug, Deserialize)]
pub struct SearchResults {
	pub results: HitsContainer,
}

#[derive(Debug, Deserialize)]
pub struct HitsContainer {
	pub hits: Option<Vec<Hit>>,
}

#[derive(Debug, Deserialize)]
pub struct Hit {
	pub document: Document,
}

#[derive(Debug, Deserialize)]
pub struct Document {
	pub title: Option<String>,
	pub activities_count: u32,
	pub id: String,
	pub isbns: Vec<String>,
	pub series_names: Vec<String>,
	pub author_names: Vec<String>,
	pub description: Option<String>,
	pub featured_series: Option<FeaturedSeries>,
	pub release_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FeaturedSeries {
	pub series_name: Option<String>,
	pub position: Option<f32>,
	pub series_book_count: Option<u32>,
}
