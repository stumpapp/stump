use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::link::{OPDSImageLink, OPDSLink};

/// An OPDS Publication is essentially a Readium Web Publication without the requirement
/// to include a readingOrder collection. An OPDS Publication:
/// - Must be identified by the following media type: application/opds-publication+json
/// - Must contain at least one [Acquisition Link](https://drafts.opds.io/opds-2.0#53-acquisition-link)
/// - Should contain a self link
///
/// See https://drafts.opds.io/opds-2.0#51-opds-publication
#[derive(Debug, Default, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[serde(rename_all = "camelCase")]
#[skip_serializing_none]
pub struct OPDSPublication {
	#[serde(default)]
	pub images: Vec<OPDSImageLink>,
	// TODO: this is literally mentioned once in the spec and that's it... Likely need to check
	// the Readium Web Publication spec for more information? From once example, it looks like links
	// are the eventual type, but need to confirm.
	pub reading_order: Option<Vec<OPDSLink>>,
}
