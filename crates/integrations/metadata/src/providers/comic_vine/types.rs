use crate::serde_utils::string_or_number;
use crate::types::SearchQuery;
use serde::Deserialize;

/// Filter builder for ComicVine issues search
#[derive(Debug, Default)]
pub struct ComicVineIssuesFilter {
	volume_id: Option<String>,
	issue_number: Option<f32>,
}

impl ComicVineIssuesFilter {
	/// convert the filter to a ComicVine API filter string -> "field1:value1,field2:value2"
	pub fn to_filter_string(&self) -> Option<String> {
		let mut filters = Vec::new();

		if let Some(volume_id) = &self.volume_id {
			filters.push(format!("volume:{}", volume_id));
		}

		if let Some(issue_number) = self.issue_number {
			filters.push(format!("issue_number:{}", issue_number));
		}

		if filters.is_empty() {
			None
		} else {
			Some(filters.join(","))
		}
	}
}

impl From<&SearchQuery> for ComicVineIssuesFilter {
	fn from(query: &SearchQuery) -> Self {
		Self {
			volume_id: query.provider_hints.get("comic_vine_volume_id").cloned(),
			issue_number: query.number,
		}
	}
}

pub enum ComicVinePrefix {
	Volume = 4050,
	Issue = 4000,
	// Character = 4005,
	// Person = 4030,
}

impl From<ComicVinePrefix> for u32 {
	fn from(prefix: ComicVinePrefix) -> Self {
		prefix as u32
	}
}

#[derive(Debug, Deserialize)]
pub struct ComicVineResponse<T> {
	pub status_code: u32,
	pub error: String,
	pub results: Option<T>,
}

#[derive(Debug, Deserialize)]
pub struct ImageUrls {
	pub super_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PublisherRef {
	pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PersonCredit {
	pub name: Option<String>,
	/// comma-separated roles, e.g. "writer, penciler"
	pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VolumeRef {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
	pub name: Option<String>,
}

// note: these two result types are minimal and will be used for consequent detail fetch

#[derive(Debug, Deserialize)]
pub struct VolumeResult {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct IssueResult {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
}

/// A minimal repr for an issue within a volume's issue list. Used to resolve an
/// issue number to an ID without an extra trip
#[derive(Debug, Deserialize)]
pub struct IssueSlim {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
	pub issue_number: Option<String>,
}

/// See https://comicvine.gamespot.com/api/documentation#toc-0-42
#[derive(Debug, Deserialize)]
pub struct VolumeDetail {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
	pub name: Option<String>,
	pub deck: Option<String>, // apparently this is a short description
	pub description: Option<String>,
	pub start_year: Option<String>,
	pub publisher: Option<PublisherRef>,
	pub image: Option<ImageUrls>,
	pub count_of_issues: Option<i32>,
	pub people: Option<Vec<PersonCredit>>,
	pub issues: Option<Vec<IssueSlim>>,
}

/// See https://comicvine.gamespot.com/api/documentation#toc-0-10
#[derive(Debug, Deserialize)]
pub struct IssueDetail {
	#[serde(deserialize_with = "string_or_number")]
	pub id: String,
	pub name: Option<String>,
	pub description: Option<String>,
	pub issue_number: Option<String>,
	pub cover_date: Option<String>, // "YYYY-MM-DD" format apparently
	pub volume: Option<VolumeRef>,
	pub image: Option<ImageUrls>,
	pub person_credits: Option<Vec<PersonCredit>>,
}
