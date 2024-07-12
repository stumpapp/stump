use derive_builder::Builder;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::link::OPDSLink;

pub const OPDS_AUTHENTICATION_DOCUMENT_REL: &str = "http://opds-spec.org/auth/document";
pub const OPDS_AUTHENTICATION_DOCUMENT_TYPE: &str =
	"application/opds-authentication+json";

/// A struct for representing an authentication document
///
/// See https://drafts.opds.io/authentication-for-opds-1.0.html#23-syntax
#[derive(Debug, Clone, Builder, Serialize, Deserialize)]
#[builder(build_fn(error = "crate::CoreError"), default, setter(into))]
#[skip_serializing_none]
pub struct OPDSAuthenticationDocument {
	/// Unique identifier for the Catalog provider and canonical location for the Authentication Document.
	/// This is actually a URL
	id: String,
	/// A list of supported Authentication Flows as defined in section [3. Authentication Flows](https://drafts.opds.io/authentication-for-opds-1.0.html#3-authentication-flows).
	authentication: Vec<OPDSAuthenticationFlow>,
	/// Title of the Catalog being accessed.
	title: String,
	/// A description of the service being displayed to the user.
	description: Option<String>,
	/// A list of links using the same syntax as defined in 2.3.2. Links.
	links: Option<Vec<OPDSLink>>,
}

// Note: The default implementation of OPDSAuthenticationDocument only contains
// basic authentication. This is simply because Stump doesn't support any alternatives.
// This should be revisited once Stump supports more authentication methods.

impl Default for OPDSAuthenticationDocument {
	fn default() -> Self {
		Self {
			id: String::from("/opds/v2.0/auth"),
			authentication: vec![OPDSAuthenticationFlow::default()],
			title: String::from("Stump OPDS V2 Auth"),
			description: None,
			links: Some(vec![OPDSLink::help()]),
		}
	}
}

impl OPDSAuthenticationDocument {
	/// A utility method for adding a logo link to the authentication document
	pub fn with_logo(&self, href: String) -> Self {
		let mut links = self.links.clone().unwrap_or_default();
		links.push(OPDSLink::logo(href));
		Self {
			links: Some(links),
			..self.clone()
		}
	}
}

/// A struct for representing a supported authentication flow
///
/// See https://drafts.opds.io/authentication-for-opds-1.0.html#3-authentication-flows
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OPDSAuthenticationFlow {
	/// A URI that identifies the nature of an Authentication Flow.
	#[serde(rename = "type")]
	_type: OPDSSupportedAuthFlow,
	/// A list of labels that can be used to provide alternate labels for fields that the client will display to the user.
	labels: Option<OPDSAuthenticationLabels>,
}

impl Default for OPDSAuthenticationFlow {
	fn default() -> Self {
		Self {
			_type: OPDSSupportedAuthFlow::Basic,
			labels: Some(OPDSAuthenticationLabels {
				login: Some(String::from("Username")),
				password: Some(String::from("Password")),
			}),
		}
	}
}

/// A struct for representing authentication labels, meant to provide alternate labels
/// for fields that the client will display to the user.
///
/// See https://drafts.opds.io/authentication-for-opds-1.0.html#311-labels
#[derive(Debug, Clone, Serialize, Deserialize)]
#[skip_serializing_none]
pub struct OPDSAuthenticationLabels {
	/// A label for the login (username) field.
	login: Option<String>,
	/// A label for the password field.
	password: Option<String>,
}

/// An enum representing the URI that identifies the nature of an Authentication Flow.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OPDSSupportedAuthFlow {
	#[serde(rename = "http://opds-spec.org/auth/basic")]
	Basic,
}

impl OPDSSupportedAuthFlow {
	pub fn description(&self) -> &str {
		match self {
			OPDSSupportedAuthFlow::Basic => {
				"Enter your username and password to authenticate."
			},
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_opds_authentication_document_default() {
		let auth_doc = OPDSAuthenticationDocument::default();
		assert_eq!(auth_doc.id, "/opds/v2.0/auth");
		assert_eq!(auth_doc.authentication.len(), 1);
		assert_eq!(auth_doc.title, "Stump OPDS V2 Auth");
		assert_eq!(auth_doc.description, None);
		assert_eq!(auth_doc.links.unwrap().len(), 1);
	}

	#[test]
	fn test_opds_authentication_document_with_logo() {
		let auth_doc = OPDSAuthenticationDocument::default()
			.with_logo("https://example.com/logo.png".to_string());
		assert_eq!(auth_doc.links.unwrap().len(), 2);
	}

	#[test]
	fn test_opds_supported_auth_flow_description() {
		let basic = OPDSSupportedAuthFlow::Basic;
		assert_eq!(
			basic.description(),
			"Enter your username and password to authenticate."
		);
	}
}
