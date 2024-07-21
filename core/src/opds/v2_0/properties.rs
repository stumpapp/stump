//! A module for representing properties in an OPDS 2.0 feed. OPDS 2.0 properties do not have an explicit
//! section in the spec, but are used throughout. This module is an interpretation of the examples given
//! in the spec.

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::link::OPDSLinkType;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSDynamicProperties(pub serde_json::Value);

pub const AUTH_ROUTE: &str = "/opds/v2.0/auth";

/// A struct for representing properties of an OPDS feed or collection
#[skip_serializing_none]
#[derive(Debug, Default, Builder, Clone, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
pub struct OPDSProperties {
	/// The URI of the authentication document
	pub authenticate: Option<OPDSAuthenticateProperties>,
	#[serde(flatten)]
	pub dynamic_properties: Option<OPDSDynamicProperties>,
}

impl OPDSProperties {
	pub fn with_auth(self, url: String) -> Self {
		Self {
			authenticate: Some(OPDSAuthenticateProperties::new(url)),
			..self
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSAuthenticateProperties {
	/// The URI of the authentication document
	pub href: String,
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
