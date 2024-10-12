//! A module for representing properties in an OPDS 2.0 feed. OPDS 2.0 properties do not have an explicit
//! section in the spec, but are used throughout. This module is an interpretation of the examples given
//! in the spec.

use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::link::OPDSLinkType;

/// A struct for representing dynamic properties of an OPDS feed or collection. This is just
/// a wrapper around a [`serde_json::Value`], which can be used to store any arbitrary JSON data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSDynamicProperties(pub serde_json::Value);

/// The route for the authentication document for Stump's OPDS 2.0 implementation
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
	/// Create a new [`OPDSProperties`] object with the given authentication URL
	pub fn with_auth(self, url: String) -> Self {
		Self {
			authenticate: Some(OPDSAuthenticateProperties::new(url)),
			..self
		}
	}
}

/// A struct for representing auth-related properties in an OPDS feed or collection. This
/// instructs the client on how to authenticate with the server for a given OPDS item
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
			href: String::from(AUTH_ROUTE),
			_type: OPDSLinkType::OpdsAuthJson,
		}
	}
}

impl OPDSAuthenticateProperties {
	pub fn new(href: String) -> Self {
		Self {
			href,
			_type: OPDSLinkType::OpdsAuthJson,
		}
	}

	pub fn document(href: String) -> Self {
		Self {
			href,
			_type: OPDSLinkType::OpdsAuthDocument,
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_opds_properties() {
		let properties = OPDSProperties::default().with_auth(AUTH_ROUTE.to_string());
		assert_eq!(properties.authenticate.unwrap().href, AUTH_ROUTE);
	}

	#[test]
	fn test_default_type() {
		let properties = OPDSAuthenticateProperties::default();
		assert_eq!(properties._type, OPDSLinkType::OpdsAuthJson);
	}

	#[test]
	fn test_document_type() {
		let properties = OPDSAuthenticateProperties::document(AUTH_ROUTE.to_string());
		assert_eq!(properties._type, OPDSLinkType::OpdsAuthDocument);
	}
}
