use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::link::OPDSLinkType;

/// A struct for representing an authentication document
///
/// See https://drafts.opds.io/authentication-for-opds-1.0.html#23-syntax
#[derive(Debug, Serialize, Deserialize)]
#[skip_serializing_none]
pub struct AuthenticationDocument {
	/// Unique identifier for the Catalog provider and canonical location for the Authentication Document.
	/// This is actually a URL
	id: String,
	/// A list of supported Authentication Flows as defined in section [3. Authentication Flows](https://drafts.opds.io/authentication-for-opds-1.0.html#3-authentication-flows).
	authentication: Vec<SupportedAuthFlow>,
	/// Title of the Catalog being accessed.
	title: String,
	/// A description of the service being displayed to the user.
	description: Option<String>,
}

/// A struct for representing a supported authentication flow
///
/// See https://drafts.opds.io/authentication-for-opds-1.0.html#3-authentication-flows
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthenticationFlow {
	/// A URI that identifies the nature of an Authentication Flow.
	#[serde(rename = "type")]
	_type: SupportedAuthFlow,
	/// The URI of the authentication flow
	uri: String,
}

/// A struct for representing authentication labels, meant to provide alternate labels
/// for fields that the client will display to the user.
///
/// See https://drafts.opds.io/authentication-for-opds-1.0.html#311-labels
#[derive(Debug, Serialize, Deserialize)]
#[skip_serializing_none]
pub struct AuthenticationLabels {
	login: Option<String>,
	password: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SupportedAuthFlow {
	#[serde(rename = "http://opds-spec.org/auth/basic")]
	Basic,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthenticateLink {
	/// The URI of the authentication document
	href: String,
	/// The type of the link
	#[serde(rename = "type")]
	_type: OPDSLinkType,
}

impl AuthenticateLink {
	pub fn new(href: String) -> Self {
		Self {
			href,
			_type: OPDSLinkType::OpdsAuth,
		}
	}
}
