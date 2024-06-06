use serde::{Deserialize, Serialize};

/// A struct for representing an authentication document
///
/// See https://drafts.opds.io/authentication-for-opds-1.0.html#23-syntax
#[derive(Debug, Serialize, Deserialize)]
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
pub struct AuthenticationLabels {
	login: Option<String>,
	password: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SupportedAuthFlow {
	#[serde(rename = "http://opds-spec.org/auth/basic")]
	Basic,
}
