//! A module for representing an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use derive_builder::Builder;
use serde::{Deserialize, Serialize};

use super::{
	group::OPDSFeedGroup,
	link::{OPDSLink, OPDSNavigationLink},
	metadata::OPDSMetadata,
};

/// An OPDS 2.0 feed collection, considered the root of an OPDS 2.0 document.
///
/// See also:
/// - https://drafts.opds.io/opds-2.0.html#11-introduction
/// - https://github.com/opds-community/drafts/blob/main/schema/feed.schema.json
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"))]
pub struct OPDSFeed {
	/// Links for the entire feed
	links: Vec<OPDSLink>,
	/// Links that an end user can follow in order to browse a catalog. It must be a compact collection.
	///
	/// See https://drafts.opds.io/opds-2.0#21-navigation
	navigation: Vec<OPDSNavigationLink>,
	/// Groups contained within the feed
	///
	/// See https://drafts.opds.io/opds-2.0#25-groups
	groups: Vec<OPDSFeedGroup>,
	// publications: Vec<Publication>,
	metadata: OPDSMetadata,
}
