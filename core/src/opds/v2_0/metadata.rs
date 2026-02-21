use chrono::Utc;
use derive_builder::Builder;
use models::entity::media_metadata;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::link::OPDSLink;

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

#[skip_serializing_none]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSDynamicMetadata(pub serde_json::Value);

impl TryFrom<media_metadata::Model> for OPDSDynamicMetadata {
	type Error = crate::CoreError;

	fn try_from(value: media_metadata::Model) -> Result<Self, Self::Error> {
		let mut json = serde_json::to_value(value)?;

		// Note: This was kinda a bug, basically I forgot to split comma-separated values
		// into arrays like I have for GraphQL
		if let Some(obj) = json.as_object_mut() {
			const ARRAY_FIELDS: &[&str] = &[
				"characters",
				"colorists",
				"cover_artists",
				"editors",
				"genres",
				"inkers",
				"letterers",
				"links",
				"pencillers",
				"teams",
				"writers",
			];

			for field in ARRAY_FIELDS {
				if let Some(val) = obj.get_mut(*field) {
					if let Some(s) = val.as_str() {
						let arr: Vec<serde_json::Value> = s
							.split(',')
							.map(|v| serde_json::Value::String(v.trim().to_owned()))
							.filter(|v| v.as_str().is_some_and(|s| !s.is_empty()))
							.collect();
						*val = serde_json::Value::Array(arr);
					}
				}
			}
		}

		Ok(Self(json))
	}
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
	dynamic_metadata: Option<OPDSDynamicMetadata>,
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
			identifier: None,
			modified: Some(Utc::now().to_rfc3339()),
			description: None,
			belongs_to: None,
			pagination: None,
			dynamic_metadata: None,
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_opds_metadata_serialization() {
		let metadata = OPDSMetadata {
			title: String::from("Book"),
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
			dynamic_metadata: Some(OPDSDynamicMetadata(serde_json::json!({
				"test": "value"
			}))),
		};

		let json = serde_json::to_string(&metadata).unwrap();
		assert_eq!(
			json,
			r#"{"title":"Book","modified":"2021-08-01T00:00:00Z","description":"A cool book","belongsTo":{"series":{"name":"Test Series","position":1}},"numberOfItems":10,"itemsPerPage":5,"currentPage":1,"test":"value"}"#
		);
	}
}
