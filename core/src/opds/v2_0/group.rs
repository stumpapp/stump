use derive_builder::Builder;
use serde::{Deserialize, Serialize};

use super::{
	link::{OPDSLink, OPDSNavigationLink},
	metadata::OPDSMetadata,
};

/// A struct representing a group, which is used to organize feeds which contain more
/// than one navigation or publication collection.
///
/// See https://drafts.opds.io/opds-2.0#25-groups
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"))]
pub struct OPDSFeedGroup {
	pub links: Vec<OPDSLink>,
	pub navigation: Vec<OPDSNavigationLink>,
	// publications: Vec<Publication>,
	pub metadata: OPDSMetadata,
}
