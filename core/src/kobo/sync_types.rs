// data types used in the Kobo sync API.

use chrono::{DateTime, Utc};
use models::{
	services::reading_progress::NormalizedProgression,
	shared::readium::{ReadiumLocation, ReadiumLocator},
};
use rust_decimal::Decimal;
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

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub struct Location {
	pub value: Option<String>,
	#[serde(rename = "Type")]
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

// TODO: support dnf?
#[derive(Clone, Copy, Serialize, Deserialize, Debug, PartialEq)]
pub enum Status {
	ReadyToRead,
	Finished,
	Reading,
}

#[derive(Serialize)]
pub struct Empty {}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateUpdateRequest {
	#[serde(default)]
	pub reading_states: Vec<ReadingStateUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateUpdate {
	pub entitlement_id: String,
	pub current_bookmark: Option<ReadingStateBookmarkUpdate>,
	pub status_info: Option<ReadingStateStatusUpdate>,
	pub last_modified: Option<DateTime<Utc>>,
}

impl ReadingStateUpdate {
	pub fn status(&self) -> Option<Status> {
		self.status_info.as_ref().map(|info| info.status)
	}

	pub fn normalized_progression(
		&self,
		device_id: Option<String>,
	) -> NormalizedProgression {
		let bookmark = self.current_bookmark.as_ref();
		let percentage = bookmark
			.and_then(|bookmark| bookmark.progress_percent)
			.and_then(percent_to_progression);
		let did_complete = self.status() == Some(Status::Finished)
			|| percentage.is_some_and(|progression| progression >= Decimal::ONE);
		let percentage = did_complete.then_some(Decimal::ONE).or(percentage);
		let locator = bookmark.and_then(|bookmark| {
			let location = bookmark.location.as_ref()?;
			Some(ReadiumLocator {
				href: location.source.clone(),
				locations: Some(ReadiumLocation {
					progression: bookmark
						.content_source_progress_percent
						.and_then(percent_to_progression),
					total_progression: percentage,
					kobo_span: location
						.type_
						.as_deref()
						.is_none_or(|kind| kind.eq_ignore_ascii_case("KoboSpan"))
						.then(|| location.value.clone())
						.flatten(),
					..Default::default()
				}),
				..Default::default()
			})
		});

		NormalizedProgression {
			locator,
			percentage,
			did_complete,
			device_id,
			reported_at: self.last_modified.map(Into::into),
			..Default::default()
		}
	}
}

fn percent_to_progression(percent: f32) -> Option<Decimal> {
	Decimal::try_from((percent / 100.0).clamp(0.0, 1.0)).ok()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateBookmarkUpdate {
	pub progress_percent: Option<f32>,
	pub content_source_progress_percent: Option<f32>,
	pub location: Option<Location>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateStatusUpdate {
	pub status: Status,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateUpdateResponse {
	pub request_result: ReadingStateUpdateResultStatus,
	pub update_results: Vec<ReadingStateUpdateResult>,
}

impl ReadingStateUpdateResponse {
	pub fn success(update_results: Vec<ReadingStateUpdateResult>) -> Self {
		Self {
			request_result: ReadingStateUpdateResultStatus::Success,
			update_results,
		}
	}
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateUpdateResult {
	pub entitlement_id: String,
	pub current_bookmark_result: ReadingStateFieldResult,
	pub statistics_result: ReadingStateFieldResult,
	pub status_info_result: ReadingStateFieldResult,
}

impl ReadingStateUpdateResult {
	pub fn success(update: &ReadingStateUpdate) -> Self {
		Self {
			entitlement_id: update.entitlement_id.clone(),
			current_bookmark_result: ReadingStateFieldResult::success(),
			statistics_result: ReadingStateFieldResult::success(),
			status_info_result: ReadingStateFieldResult::success(),
		}
	}
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ReadingStateFieldResult {
	pub result: ReadingStateUpdateResultStatus,
}

impl ReadingStateFieldResult {
	fn success() -> Self {
		Self {
			result: ReadingStateUpdateResultStatus::Success,
		}
	}
}

#[derive(Clone, Copy, Debug, Serialize)]
pub enum ReadingStateUpdateResultStatus {
	Success,
}

#[cfg(test)]
mod update_tests {
	use serde_json::json;

	use super::{
		ReadingStateUpdateRequest, ReadingStateUpdateResponse, ReadingStateUpdateResult,
		Status,
	};

	#[test]
	fn deserializes_and_normalizes_a_kobo_reading_state() {
		let request: ReadingStateUpdateRequest = serde_json::from_value(json!({
			"ReadingStates": [{
				"CurrentBookmark": {
					"ContentSourceProgressPercent": 65,
					"Location": {
						"Source": "OEBPS/chapter.xhtml",
						"Type": "KoboSpan",
						"Value": "kobo.1.1"
					},
					"ProgressPercent": 19
				},
				"EntitlementId": "book-id",
				"LastModified": "2030-01-01T00:00:00Z",
				"Statistics": { "SpentReadingMinutes": 3 },
				"StatusInfo": { "Status": "Reading" }
			}]
		}))
		.unwrap();

		let update = request.reading_states.first().unwrap();
		assert_eq!(update.status(), Some(Status::Reading));
		let progression = update.normalized_progression(Some("device-id".to_string()));
		assert_eq!(progression.percentage.unwrap().to_string(), "0.19");
		assert_eq!(
			progression.reported_at.unwrap().to_utc().to_rfc3339(),
			"2030-01-01T00:00:00+00:00"
		);
		let locator = progression.locator.unwrap();
		assert_eq!(locator.href, "OEBPS/chapter.xhtml");
		assert_eq!(
			locator.locations.unwrap().kobo_span.as_deref(),
			Some("kobo.1.1")
		);

		let response =
			ReadingStateUpdateResponse::success(vec![ReadingStateUpdateResult::success(
				update,
			)]);
		assert_eq!(
			serde_json::to_value(response).unwrap(),
			json!({
				"RequestResult": "Success",
				"UpdateResults": [{
					"EntitlementId": "book-id",
					"CurrentBookmarkResult": { "Result": "Success" },
					"StatisticsResult": { "Result": "Success" },
					"StatusInfoResult": { "Result": "Success" }
				}]
			})
		);
	}
}
