use derive_builder::Builder;
use prisma_client_rust::chrono::Utc;
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
	number_of_items: Option<i64>,
	/// The number of items per page
	items_per_page: Option<i64>,
	/// The current page number, **1-indexed**
	current_page: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSEntryBelongsToEntity {
	/// The name of the entity the entry belongs to
	name: String,
	// TODO: This will require a custom SQL query, most likely using RANK?
	/// The position of the entry within the entity, **1-indexed**.
	///
	/// For example, if the entry is the first book in a series, this field would be `1`.
	position: i64,
	/// A list of links to the entity, if available. This **should** include a link to the entity itself
	/// within the catalog.
	links: Vec<OPDSLink>,
}

/// An enum representing the supported types of entities that an OPDS entry can belong to
/// in Stump. All variants will use the same [`OPDSEntryBelongsToEntity`] struct - this
/// is primarily a (de)serialization convenience to enforce allowed keys.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum OPDSEntryBelongsTo {
	Series(OPDSEntryBelongsToEntity),
}

/// Metadata for an OPDS 2.0 feed or collection
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[skip_serializing_none]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
pub struct OPDSMetadata {
	/// The title of the feed or collection
	title: String,
	/// The date and time the feed or collection was last modified, in RFC 3339 format
	modified: Option<String>,
	/// A human-readable description, if available
	description: Option<String>,
	#[serde(flatten)]
	pagination: Option<OPDSPaginationMetadata>,
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
			modified: Some(Utc::now().to_rfc3339()),
			description: None,
			pagination: None,
		}
	}
}
