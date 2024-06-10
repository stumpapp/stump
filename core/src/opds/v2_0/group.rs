use derive_builder::Builder;
use serde::{Deserialize, Serialize};

use super::{
	link::{OPDSLink, OPDSNavigationLink},
	metadata::OPDSMetadata,
	publication::OPDSPublication,
};

// TODO: a validator function that validates:
// - At least one nativation or publication collection
//
// See #[builder(build_fn(validate = "path::to::fn"))] https://github.com/colin-kiegel/rust-derive-builder

/// A struct representing a group, which is used to organize feeds which contain more
/// than one navigation or publication collection.
///
/// See https://drafts.opds.io/opds-2.0#25-groups
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"))]
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
