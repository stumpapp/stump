// data types used in the Kobo sync API.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub enum SyncItem {
	NewEntitlement(BookEntitlementContainer),
	ChangedEntitlement(BookEntitlementContainer),
	ChangedProductMetadata(BookMetadata),
	ChangedReadingState(ReadingStateContainer),
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BookEntitlementContainer {
	pub book_entitlement: BookEntitlement,
	pub book_metadata: BookMetadata,
	pub reading_state: Option<ReadingState>,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateContainer {
	pub reading_state: ReadingState,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BookEntitlement {
	pub accessibility: String,
	pub active_period: Period,
	pub created: DateTime<Utc>,
	pub cross_revision_id: String,
	pub id: String,
	pub is_hidden_from_archive: bool,
	pub is_locked: bool,
	pub is_removed: bool,
	pub last_modified: DateTime<Utc>,
	pub origin_category: String,
	pub revision_id: String,
	pub status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct Period {
	pub from: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct BookMetadata {
	pub categories: Vec<String>,
	pub contributor_roles: Vec<ContributorRole>,
	pub contributors: Vec<String>,
	pub cover_image_id: String,
	pub cross_revision_id: String,
	pub current_display_price: DisplayPrice,
	pub current_love_display_price: LoveDisplayPrice,
	pub description: Option<String>,
	pub download_urls: Vec<DownloadUrl>,
	pub entitlement_id: String,
	pub external_ids: Vec<String>,
	pub genre: String,
	pub is_eligible_for_kobo_love: bool,
	pub is_internet_archive: bool,
	pub is_pre_order: bool,
	pub is_social_enabled: bool,
	pub isbn: Option<String>,
	pub language: String,
	// according to Komga this is a Map<String, String>.
	pub phonetic_pronunciations: Empty,
	pub publication_date: Option<DateTime<Utc>>,
	pub publisher: Option<Publisher>,
	pub revision_id: String,
	pub series: Option<Series>,
	pub title: String,
	pub work_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ContributorRole {
	pub name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct DisplayPrice {
	pub currency_code: String,
	pub total_amount: i64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct LoveDisplayPrice {
	pub total_amount: i64,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct DownloadUrl {
	pub drm_type: String,
	pub format: Format,
	pub size: u64,
	pub platform: String,
	pub url: String,
}

#[derive(Serialize, Deserialize)]
pub enum Format {
	EPUB3FL,
	EPUB,
	EPUB3,
	KEPUB,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Publisher {
	pub imprint: String,
	pub name: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Series {
	pub id: String,
	pub name: String,
	pub number: String,
	pub number_float: f32,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingState {
	pub created: DateTime<Utc>,
	pub current_bookmark: CurrentBookmark,
	pub entitlement_id: String,
	pub last_modified: DateTime<Utc>,
	pub priority_timestamp: DateTime<Utc>,
	pub statistics: Statistics,
	pub status_info: StatusInfo,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct CurrentBookmark {
	pub last_modified: DateTime<Utc>,
	pub progress_percent: Option<f32>,
	pub content_source_progress_percent: Option<f32>,
	pub location: Option<Location>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct Location {
	pub value: Option<String>,
	pub type_: Option<String>,
	pub source: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct Statistics {
	pub last_modified: DateTime<Utc>,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct StatusInfo {
	pub last_modified: DateTime<Utc>,
	pub status: Status,
	pub times_started_reading: u32,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub enum Status {
	ReadyToRead,
	Finished,
	Reading,
}

#[derive(Serialize)]
pub struct Empty {}
