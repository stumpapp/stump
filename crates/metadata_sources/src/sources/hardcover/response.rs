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

// TODO - Are underscored values needed?
#[derive(Debug, Deserialize)]
pub struct Document {
	pub title: Option<String>,
	pub _activities_count: u32,
	pub _id: String,
	pub _isbns: Vec<String>,
	pub _series_names: Vec<String>,
	pub author_names: Vec<String>,
	pub description: Option<String>,
	pub _featured_series: Option<FeaturedSeries>,
	pub release_date: Option<String>,
}

// TODO - Are underscored values needed?
#[derive(Debug, Deserialize)]
pub struct FeaturedSeries {
	pub _series_name: Option<String>,
	pub _position: Option<f32>,
	pub _series_book_count: Option<u32>,
}
