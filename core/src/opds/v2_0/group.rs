//! A module for representing groups in an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0#25-groups

use derive_builder::Builder;
use serde::{Deserialize, Serialize};

use super::{
	link::{OPDSLink, OPDSNavigationLink},
	metadata::OPDSMetadata,
	publication::OPDSPublication,
	OPDSV2Error,
};

/// A struct representing a group, which is used to organize feeds which contain more
/// than one navigation or publication collection.
///
/// See https://drafts.opds.io/opds-2.0#25-groups
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(
	build_fn(error = "OPDSV2Error", validate = "Self::validate"),
	setter(into)
)]
pub struct OPDSFeedGroup {
	/// A list of links for the feed group
	#[builder(default)]
	#[serde(skip_serializing_if = "Vec::is_empty")]
	links: Vec<OPDSLink>,
	/// A list of navigation links for the feed group
	#[builder(default)]
	#[serde(skip_serializing_if = "Vec::is_empty")]
	navigation: Vec<OPDSNavigationLink>,
	/// A list of publications for the feed group, if available.
	#[builder(default)]
	#[serde(skip_serializing_if = "Vec::is_empty")]
	publications: Vec<OPDSPublication>,
	/// The metadata for the feed group
	metadata: OPDSMetadata,

	#[builder(default = "true")]
	#[serde(skip_serializing)]
	pub allow_empty: bool,
}

impl OPDSFeedGroupBuilder {
	fn validate(&self) -> Result<(), OPDSV2Error> {
		if self.allow_empty.unwrap_or(true) {
			return Ok(());
		}

		let navigation_empty = self
			.navigation
			.as_ref()
			.map_or(true, std::vec::Vec::is_empty);

		let publications_empty = self
			.publications
			.as_ref()
			.map_or(true, std::vec::Vec::is_empty);

		if navigation_empty && publications_empty {
			return Err(OPDSV2Error::FeedValidationFailed(
				"OPDSFeedGroup missing at least one navigation link or publication"
					.to_string(),
			));
		}

		Ok(())
	}
}

#[cfg(test)]
mod tests {
	use crate::opds::v2_0::{
		link::{OPDSBaseLinkBuilder, OPDSLinkRel, OPDSNavigationLinkBuilder},
		metadata::OPDSMetadataBuilder,
	};

	use super::*;

	#[test]
	fn test_opds_feed_group_without_failure() {
		let group = OPDSFeedGroupBuilder::default()
			.links(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/catalog".to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()
					.unwrap(),
			)])
			.navigation(vec![OPDSNavigationLinkBuilder::default()
				.title("Test Navigation".to_string())
				.base_link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/catalog".to_string())
						.rel(OPDSLinkRel::SelfLink.item())
						.build()
						.unwrap(),
				)
				.build()
				.unwrap()])
			.publications(vec![])
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Test Group".to_string())
					.build()
					.unwrap(),
			)
			.build()
			.expect("Failed to build OPDSFeedGroup");

		assert_eq!(group.links.len(), 1);
		assert_eq!(group.navigation.len(), 1);
	}

	#[test]
	fn test_opds_feed_group_with_failure() {
		let error = OPDSFeedGroupBuilder::default()
			.links(vec![])
			.navigation(vec![])
			.publications(vec![])
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Test Group".to_string())
					.build()
					.unwrap(),
			)
			.allow_empty(false)
			.build()
			.unwrap_err();

		assert!(error.to_string().contains(
			"OPDSFeedGroup missing at least one navigation link or publication"
		));
	}
}
