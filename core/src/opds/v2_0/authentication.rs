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

impl Default for OPDSAuthenticationDocument {
	fn default() -> Self {
		Self {
			id: String::from("/opds/v2.0/auth"),
			authentication: vec![OPDSAuthenticationFlow::default()],
			title: String::from("Stump OPDS V2 Auth"),
			description: None,
			links: Some(vec![OPDSLink::help(), OPDSLink::logo()]),
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
	// /// The URI of the authentication flow
	// uri: String,
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
	login: Option<String>,
	password: Option<String>,
}

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
