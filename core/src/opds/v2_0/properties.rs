use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::link::OPDSLinkType;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSDynamicProperties(serde_json::Value);

#[derive(Debug, Default, Builder, Clone, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[skip_serializing_none]
pub struct OPDSProperties {
	authenticate: Option<OPDSAuthenticateProperties>,
	#[serde(flatten)]
	dynamic_properties: Option<OPDSDynamicProperties>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSAuthenticateProperties {
	/// The URI of the authentication document
	href: String,
	/// The type of the link
	#[serde(rename = "type")]
	_type: OPDSLinkType,
}

impl Default for OPDSAuthenticateProperties {
	fn default() -> Self {
		Self {
			href: String::from("/opds/v2.0/auth"),
			_type: OPDSLinkType::OpdsAuth,
		}
	}
}

impl OPDSAuthenticateProperties {
	pub fn new(href: String) -> Self {
		Self {
			href,
			_type: OPDSLinkType::OpdsAuth,
		}
	}
}
