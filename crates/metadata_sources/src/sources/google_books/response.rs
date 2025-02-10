use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct GoogleBooksResponse {
	pub items: Option<Vec<GoogleBooksVolume>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleBooksVolume {
	pub volume_info: GoogleBooksVolumeInfo,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleBooksVolumeInfo {
	pub title: Option<String>,
	pub authors: Option<Vec<String>>,
	pub description: Option<String>,
	pub published_date: Option<String>,
}
