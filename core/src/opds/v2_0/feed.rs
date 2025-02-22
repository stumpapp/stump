//! A module for representing an OPDS 2.0 feed, as defined by the OPDS 2.0 spec at
//! https://drafts.opds.io/opds-2.0

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::{
	group::OPDSFeedGroup,
	link::{OPDSLink, OPDSNavigationLink},
	metadata::OPDSMetadata,
	publication::OPDSPublication,
	OPDSV2Error,
};

/// An OPDS 2.0 feed collection, considered the root of an OPDS 2.0 document.
///
/// See also:
/// - https://drafts.opds.io/opds-2.0.html#11-introduction
/// - https://github.com/opds-community/drafts/blob/main/schema/feed.schema.json
#[skip_serializing_none]
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(
	build_fn(error = "OPDSV2Error", validate = "Self::validate"),
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

	#[builder(default = "true")]
	#[serde(skip_serializing)]
	pub allow_empty: bool,
}

impl OPDSFeedBuilder {
	fn validate(&self) -> Result<(), OPDSV2Error> {
		if self.allow_empty.unwrap_or(true) {
			return Ok(());
		}

		if self.groups.is_none() && self.publications.is_none() {
			return Err(OPDSV2Error::FeedValidationFailed(
				"OPDSFeed missing at least one group or publication".to_string(),
			));
		}

		if self.navigation.is_none() && self.links.is_none() {
			return Err(OPDSV2Error::FeedValidationFailed(
				"OPDSFeed missing at least one navigation link or link".to_string(),
			));
		}

		Ok(())
	}
}

#[cfg(test)]
mod tests {
	use crate::opds::v2_0::{
		group::OPDSFeedGroupBuilder,
		link::{OPDSBaseLinkBuilder, OPDSLinkRel, OPDSNavigationLinkBuilder},
		metadata::OPDSMetadataBuilder,
	};

	use super::*;

	#[test]
	fn test_opds_feed_without_failure() {
		let feed = OPDSFeedBuilder::default()
			.links(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/catalog".to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()
					.unwrap(),
			)])
			.navigation(vec![OPDSNavigationLinkBuilder::default()
				.title("Libraries".to_string())
				.base_link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/libraries".to_string())
						.rel(OPDSLinkRel::Subsection.item())
						.build()
						.unwrap(),
				)
				.build()
				.unwrap()])
			.groups(vec![OPDSFeedGroupBuilder::default()
				.links(vec![OPDSLink::Link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/libraries".to_string())
						.build()
						.unwrap(),
				)])
				.navigation(vec![OPDSNavigationLinkBuilder::default()
					.title("Marvel".to_string())
					.base_link(
						OPDSBaseLinkBuilder::default()
							.href("/opds/v2.0/libraries/3909135a-a1c6-423a-b24a-87097d2bc2ba".to_string())
							.rel(OPDSLinkRel::SelfLink.item())
							.build()
							.unwrap(),
					)
					.build()
					.unwrap(),
					OPDSNavigationLinkBuilder::default()
						.title("Ebooks".to_string())
						.base_link(
							OPDSBaseLinkBuilder::default()
								.href("/opds/v2.0/libraries/8f080af0-709a-4104-a876-8468522bd3b2".to_string())
								.rel(OPDSLinkRel::SelfLink.item())
								.build()
								.unwrap(),
						)
						.build()
						.unwrap(),
					OPDSNavigationLinkBuilder::default()
						.title("Image".to_string())
						.base_link(
							OPDSBaseLinkBuilder::default()
								.href("/opds/v2.0/libraries/90b14037-8cdd-43bb-82df-b6b56748904c".to_string())
								.rel(OPDSLinkRel::SelfLink.item())
								.build()
								.unwrap(),
						)
						.build()
						.unwrap()])
				.metadata(
					OPDSMetadataBuilder::default()
						.title("Libraries".to_string())
						.modified("2024-06-26".to_string())
						.build()
						.unwrap(),
				)
				.build()
				.unwrap()])
			.metadata(
				OPDSMetadataBuilder::default()
					.title("Stump OPDS V2 Catalog".to_string())
					.modified("2024-06-26".to_string())
					.build()
					.unwrap(),
			)
			.build()
			.expect("Failed to build OPDSFeed");

		assert_eq!(feed.groups.unwrap().len(), 1);
		assert_eq!(feed.navigation.unwrap().len(), 1);
		assert_eq!(feed.links.unwrap().len(), 1);
	}

	#[test]
	fn test_opds_feed_no_groups_or_publications_failure() {
		let error = OPDSFeedBuilder::default()
			.links(vec![OPDSLink::Link(
				OPDSBaseLinkBuilder::default()
					.href("/opds/v2.0/catalog".to_string())
					.rel(OPDSLinkRel::SelfLink.item())
					.build()
					.unwrap(),
			)])
			.navigation(vec![OPDSNavigationLinkBuilder::default()
				.title("Libraries".to_string())
				.base_link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/libraries".to_string())
						.rel(OPDSLinkRel::Subsection.item())
						.build()
						.unwrap(),
				)
				.build()
				.unwrap()])
			.allow_empty(false)
			.build()
			.unwrap_err();

		assert!(error
			.to_string()
			.contains("OPDSFeed missing at least one group or publication"));
	}

	#[test]
	fn test_opds_feed_no_navigation_or_links_failure() {
		let error = OPDSFeedBuilder::default()
			.groups(vec![OPDSFeedGroupBuilder::default()
				.links(vec![OPDSLink::Link(
					OPDSBaseLinkBuilder::default()
						.href("/opds/v2.0/libraries".to_string())
						.build()
						.unwrap(),
				)])
				.navigation(vec![OPDSNavigationLinkBuilder::default()
					.title("Marvel".to_string())
					.base_link(
						OPDSBaseLinkBuilder::default()
							.href("/opds/v2.0/libraries/3909135a-a1c6-423a-b24a-87097d2bc2ba".to_string())
							.rel(OPDSLinkRel::SelfLink.item())
							.build()
							.unwrap(),
					)
					.build()
					.unwrap(),
					OPDSNavigationLinkBuilder::default()
						.title("Ebooks".to_string())
						.base_link(
							OPDSBaseLinkBuilder::default()
								.href("/opds/v2.0/libraries/8f080af0-709a-4104-a876-8468522bd3b2".to_string())
								.rel(OPDSLinkRel::SelfLink.item())
								.build()
								.unwrap(),
						)
						.build()
						.unwrap(),
					OPDSNavigationLinkBuilder::default()
						.title("Image".to_string())
						.base_link(
							OPDSBaseLinkBuilder::default()
								.href("/opds/v2.0/libraries/90b14037-8cdd-43bb-82df-b6b56748904c".to_string())
								.rel(OPDSLinkRel::SelfLink.item())
								.build()
								.unwrap(),
						)
						.build()
						.unwrap()])
				.metadata(
					OPDSMetadataBuilder::default()
						.title("Libraries".to_string())
						.modified("2024-06-26".to_string())
						.build()
						.unwrap(),
				)
				.build()
				.unwrap()])
			.allow_empty(false)
			.build()
			.unwrap_err();

		assert!(error
			.to_string()
			.contains("OPDSFeed missing at least one navigation link or link"));
	}
}
