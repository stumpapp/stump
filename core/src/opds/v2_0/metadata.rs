use derive_builder::Builder;
use prisma_client_rust::chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

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
	// TODO: determine index start (i.e. 1 or 0)
	/// The current page number
	current_page: Option<i64>,
}

/// Metadata for an OPDS 2.0 feed or collection
#[skip_serializing_none]
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
pub struct OPDSMetadata {
	/// The title of the feed or collection
	title: String,
	// TODO: standardize on a single date format, use an actual chrono type
	// and just create a custom serializer to enforce during serialization
	modified: Option<String>,
	/// A human-readable description, if available
	description: Option<String>,
	#[serde(flatten)]
	pagination: Option<OPDSPaginationMetadata>,
}

impl OPDSMetadata {
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
