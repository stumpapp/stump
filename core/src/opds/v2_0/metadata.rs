use chrono::Utc;
use derive_builder::Builder;
use models::entity::media_metadata;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::CoreError;

use super::link::{OPDSLink, OPDSLinkFinalizer, OPDSLinkType};

/// A contributor object in the OPDS/Readium spec
///
/// See https://readium.org/webpub-manifest/schema/contributor.schema.json
#[skip_serializing_none]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSContributor {
	pub name: String,
	#[serde(default, skip_serializing_if = "Vec::is_empty")]
	pub links: Vec<OPDSContributorLink>,
}

/// A simplified link used inside contributor objects. Not using full OPDS links to
/// avoid confusion
#[skip_serializing_none]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSContributorLink {
	pub href: String,
	#[serde(rename = "type")]
	pub _type: Option<OPDSLinkType>,
}

/// Split a comma-separated string into contributor objects, each with a browse filter link.
fn csv_to_contributors(
	csv: Option<String>,
	query_param: &str,
	finalizer: &OPDSLinkFinalizer,
) -> Option<Vec<OPDSContributor>> {
	let csv = csv?;
	let contributors: Vec<OPDSContributor> = csv
		.split(',')
		.map(|s| s.trim())
		.filter(|s| !s.is_empty())
		.map(|name| {
			let encoded = urlencoding::encode(name);
			let href = finalizer
				.format_link(format!("/opds/v2.0/books/browse?{query_param}={encoded}"));
			OPDSContributor {
				name: name.to_owned(),
				links: vec![OPDSContributorLink {
					href,
					_type: Some(OPDSLinkType::OpdsJson),
				}],
			}
		})
		.collect();

	if contributors.is_empty() {
		None
	} else {
		Some(contributors)
	}
}

fn csv_to_strings(csv: Option<String>) -> Option<Vec<String>> {
	let csv = csv?;
	let items: Vec<String> = csv
		.split(',')
		.map(|s| s.trim().to_owned())
		.filter(|s| !s.is_empty())
		.collect();

	if items.is_empty() {
		None
	} else {
		Some(items)
	}
}

/// A struct representing the Web Publication metadata for an OPDS entry, not all
/// fields from spec were added.
///
/// See https://readium.org/webpub-manifest/schema/metadata.schema.json
#[skip_serializing_none]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OPDSWebPubMetadata {
	pub author: Option<Vec<OPDSContributor>>,
	pub penciler: Option<Vec<OPDSContributor>>,
	pub colorist: Option<Vec<OPDSContributor>>,
	pub inker: Option<Vec<OPDSContributor>>,
	pub letterer: Option<Vec<OPDSContributor>>,
	pub editor: Option<Vec<OPDSContributor>>,
	pub cover_artist: Option<Vec<OPDSContributor>>,
	pub subject: Option<Vec<OPDSContributor>>,
	pub characters: Option<Vec<OPDSContributor>>,
	pub teams: Option<Vec<OPDSContributor>>,
	pub links: Option<Vec<String>>,
	pub number_of_pages: Option<i32>,
	pub publisher: Option<String>,
	pub language: Option<String>,
	pub number: Option<rust_decimal::Decimal>,
	pub age_rating: Option<i32>,
	pub year: Option<i32>,
	pub month: Option<i32>,
	pub day: Option<i32>,
	pub volume: Option<i32>,
}

impl OPDSWebPubMetadata {
	pub fn from_model(
		model: media_metadata::Model,
		finalizer: &OPDSLinkFinalizer,
	) -> Result<Self, CoreError> {
		Ok(Self {
			author: csv_to_contributors(model.writers, "author", finalizer),
			penciler: csv_to_contributors(model.pencillers, "penciler", finalizer),
			colorist: csv_to_contributors(model.colorists, "colorist", finalizer),
			inker: csv_to_contributors(model.inkers, "inker", finalizer),
			letterer: csv_to_contributors(model.letterers, "letterer", finalizer),
			editor: csv_to_contributors(model.editors, "editor", finalizer),
			cover_artist: csv_to_contributors(
				model.cover_artists,
				"coverArtist",
				finalizer,
			),
			subject: csv_to_contributors(model.genres, "subject", finalizer),
			characters: csv_to_contributors(model.characters, "characters", finalizer),
			teams: csv_to_contributors(model.teams, "teams", finalizer),
			links: csv_to_strings(model.links),
			number_of_pages: model.page_count,
			publisher: model.publisher,
			language: model.language,
			number: model.number,
			age_rating: model.age_rating,
			year: model.year,
			month: model.month,
			day: model.day,
			volume: model.volume,
		})
	}
}

/// Pagination-specific metadata fields for an OPDS collection
///
/// See https://drafts.opds.io/opds-2.0#4-pagination
#[skip_serializing_none]
#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
pub struct OPDSPaginationMetadata {
	/// The total number of items available for the feed
	number_of_items: Option<u64>,
	/// The number of items per page
	items_per_page: Option<u64>,
	/// The current page number, **1-indexed**
	current_page: Option<u64>,
}

/// This is used to provide additional context for an entry, such as its position within a series.
///
/// Note that the spec does not explicitly define this, and the only example of it is in the
/// metadata section of the spec: https://drafts.opds.io/opds-2.0#52-metadata
#[skip_serializing_none]
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), setter(into))]
pub struct OPDSEntryBelongsToEntity {
	/// The name of the entity the entry belongs to
	name: String,
	/// The position of the entry within the entity, **1-indexed**.
	///
	/// For example, if the entry is the first book in a series, this field would be `1`.
	position: Option<i64>,
	/// A list of links to the entity, if available. This **should** include a link to the entity itself
	/// within the catalog.
	#[builder(default)]
	#[serde(skip_serializing_if = "Vec::is_empty")]
	links: Vec<OPDSLink>,
}

// TODO(OPDS-V2): should each variant be ArrayOrItem<OPDSEntryBelongsToEntity> ?
/// An enum representing the supported types of entities that an OPDS entry can belong to
/// in Stump. All variants will use the same [`OPDSEntryBelongsToEntity`] struct - this
/// is primarily a (de)serialization convenience to enforce allowed keys.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OPDSEntryBelongsTo {
	Series(OPDSEntryBelongsToEntity),
}

/// Metadata for an OPDS 2.0 feed or collection
/// See also: https://github.com/readium/webpub-manifest/tree/master/contexts/default
#[skip_serializing_none]
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
pub struct OPDSMetadata {
	/// The title of the feed or collection
	title: String,
	/// An optional subtitle for the feed or collection
	subtitle: Option<String>,
	/// The unique identifier for the feed or collection
	identifier: Option<String>,
	/// The date and time the feed or collection was last modified, in RFC 3339 format
	modified: Option<String>,
	/// A human-readable description, if available
	description: Option<String>,
	/// The entity that the feed or collection belongs to, if applicable
	belongs_to: Option<OPDSEntryBelongsTo>,
	#[serde(flatten)]
	pagination: Option<OPDSPaginationMetadata>,
	#[serde(flatten)]
	webpub_metadata: Option<OPDSWebPubMetadata>,
}

impl OPDSMetadata {
	/// Generate a modified date string for the metadata, using the current time
	pub fn generate_modified() -> String {
		Utc::now().to_rfc3339()
	}
}

impl Default for OPDSMetadata {
	fn default() -> Self {
		Self {
			title: String::new(),
			subtitle: None,
			identifier: None,
			modified: Some(Utc::now().to_rfc3339()),
			description: None,
			belongs_to: None,
			pagination: None,
			webpub_metadata: None,
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::opds::v2_0::link::OPDSLinkFinalizer;

	#[test]
	fn test_opds_metadata_serialization() {
		let metadata = OPDSMetadata {
			title: String::from("Book"),
			subtitle: None,
			identifier: None,
			modified: Some(String::from("2021-08-01T00:00:00Z")),
			description: Some(String::from("A cool book")),
			belongs_to: Some(OPDSEntryBelongsTo::Series(OPDSEntryBelongsToEntity {
				name: String::from("Test Series"),
				position: Some(1),
				links: vec![],
			})),
			pagination: Some(OPDSPaginationMetadata {
				number_of_items: Some(10),
				items_per_page: Some(5),
				current_page: Some(1),
			}),
			webpub_metadata: Some(OPDSWebPubMetadata {
				publisher: Some("Test Publisher".to_string()),
				..Default::default()
			}),
		};

		let json = serde_json::to_string(&metadata).unwrap();
		assert_eq!(
			json,
			r#"{"title":"Book","modified":"2021-08-01T00:00:00Z","description":"A cool book","belongsTo":{"series":{"name":"Test Series","position":1}},"numberOfItems":10,"itemsPerPage":5,"currentPage":1,"publisher":"Test Publisher"}"#
		);
	}

	#[test]
	fn test_webpub_metadata_from_model_creates_contributor_objects() {
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());
		let model = media_metadata::Model {
			writers: Some("Writer A,Writer B".to_string()),
			..Default::default()
		};

		let webpub = OPDSWebPubMetadata::from_model(model, &finalizer).unwrap();
		let authors = webpub.author.unwrap();

		assert_eq!(authors.len(), 2);

		assert_eq!(authors[0].name, "Writer A");
		assert_eq!(authors[0].links.len(), 1);
		assert_eq!(authors[0].links[0]._type, Some(OPDSLinkType::OpdsJson));
		assert!(authors[0].links[0]
			.href
			.contains("/opds/v2.0/books/browse?author=Writer%20A"));

		assert_eq!(authors[1].name, "Writer B");
		assert!(authors[1].links[0].href.contains("author=Writer%20B"));
	}

	#[test]
	fn test_webpub_metadata_from_model_subjects_have_links() {
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());
		let model = media_metadata::Model {
			genres: Some("Sci-Fi,Fantasy".to_string()),
			..Default::default()
		};

		let webpub = OPDSWebPubMetadata::from_model(model, &finalizer).unwrap();
		let subjects = webpub.subject.unwrap();

		assert_eq!(subjects.len(), 2);
		assert_eq!(subjects[0].name, "Sci-Fi");
		assert!(subjects[0].links[0].href.contains("subject=Sci-Fi"));
	}

	#[test]
	fn test_webpub_metadata_from_model_skips_null_fields() {
		let finalizer = OPDSLinkFinalizer::new("https://example.com".to_string());
		let model = media_metadata::Model::default();

		let webpub = OPDSWebPubMetadata::from_model(model, &finalizer).unwrap();

		assert!(webpub.author.is_none());
		assert!(webpub.penciler.is_none());
		assert!(webpub.colorist.is_none());
		assert!(webpub.subject.is_none());
		assert!(webpub.number_of_pages.is_none());
	}
}
