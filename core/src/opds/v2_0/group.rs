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
	links: Vec<OPDSLink>,
	/// A list of navigation links for the feed group
	#[builder(default)]
	navigation: Vec<OPDSNavigationLink>,
	/// A list of publications for the feed group, if available.
	#[builder(default)]
	publications: Vec<OPDSPublication>,
	metadata: OPDSMetadata,
}

impl OPDSFeedGroupBuilder {
	fn validate(&self) -> Result<(), OPDSV2Error> {
		let navigation_empty = self
			.navigation
			.as_ref()
			.map(|nav| nav.is_empty())
			.unwrap_or(true);

		let publications_empty = self
			.publications
			.as_ref()
			.map(|pubs| pubs.is_empty())
			.unwrap_or(true);

		if navigation_empty && publications_empty {
			return Err(OPDSV2Error::FeedValidationFailed(
				"OPDSFeedGroup missing at least one navigation link or publication"
					.to_string(),
			));
		}

		Ok(())
	}
}
