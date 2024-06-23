//! A module for representing an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use crate::CoreError;

use super::{
	group::OPDSFeedGroup,
	link::{OPDSLink, OPDSNavigationLink},
	metadata::OPDSMetadata,
	publication::OPDSPublication,
};

/// An OPDS 2.0 feed collection, considered the root of an OPDS 2.0 document.
///
/// See also:
/// - https://drafts.opds.io/opds-2.0.html#11-introduction
/// - https://github.com/opds-community/drafts/blob/main/schema/feed.schema.json
#[skip_serializing_none]
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(
	build_fn(error = "crate::CoreError", validate = "Self::validate"),
	setter(into)
)]
pub struct OPDSFeed {
	/// Links for the entire feed
	#[builder(default)]
	links: Option<Vec<OPDSLink>>,
	/// Links that an end user can follow in order to browse a catalog. It must be a compact collection.
	///
	/// See https://drafts.opds.io/opds-2.0#21-navigation
	#[builder(default)]
	navigation: Option<Vec<OPDSNavigationLink>>,
	/// Groups contained within the feed
	///
	/// See https://drafts.opds.io/opds-2.0#25-groups
	#[builder(default)]
	groups: Option<Vec<OPDSFeedGroup>>,
	/// Publications contained within the feed
	#[builder(default)]
	publications: Option<Vec<OPDSPublication>>,
	/// Metadata for the feed
	metadata: OPDSMetadata,
}

impl OPDSFeedBuilder {
	fn validate(&self) -> Result<(), CoreError> {
		if self.groups.is_none() && self.publications.is_none() {
			return Err(CoreError::InternalError(
				"At least one group or publication collection must be present in an OPDS feed"
					.to_string(),
			));
		}

		if self.navigation.is_none() && self.links.is_none() {
			return Err(CoreError::InternalError(
				"At least one navigation link or link must be present in an OPDS feed"
					.to_string(),
			));
		}

		Ok(())
	}
}
