use std::env;

use async_graphql::SimpleObject;
use serde::{Deserialize, Serialize};

use super::env_keys::*;

const REQUIRED_SCOPES: &str = "openid,email";

/// Configuration for OpenID Connect (OIDC) authentication
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, SimpleObject)]
#[graphql(name = "OidcConfig")]
pub struct OidcConfig {
	/// Whether to enable OIDC authentication
	#[serde(default)]
	pub enabled: bool,
	/// The OIDC provider client ID
	#[serde(default)]
	pub client_id: String,
	/// The OIDC provider issuer URL (e.g., https://accounts.google.com)
	#[serde(default)]
	pub issuer_url: String,
	/// The client secret
	#[serde(default)]
	pub client_secret: String,
	/// Additional scopes to request (comma-separated)
	/// Default: "openid,email,profile"
	#[serde(default = "default_oidc_scopes")]
	pub scopes: String,
	/// Allow automatic user registration via OIDC
	#[serde(default = "default_true")]
	pub allow_registration: bool,
	/// Disable local password authentication when OIDC is enabled
	#[serde(default)]
	pub disable_local_auth: bool,
}

impl Default for OidcConfig {
	fn default() -> Self {
		Self {
			enabled: false,
			client_id: String::new(),
			issuer_url: String::new(),
			client_secret: String::new(),
			scopes: default_oidc_scopes(),
			allow_registration: true,
			disable_local_auth: false,
		}
	}
}

fn default_oidc_scopes() -> String {
	"openid,email,profile".to_string()
}

fn default_true() -> bool {
	true
}

impl OidcConfig {
	/// Load OIDC configuration from environment variables
	/// Returns None if OIDC is not enabled or not properly configured
	pub fn from_env() -> Option<Self> {
		let enabled = env::var(OIDC_ENABLED_KEY)
			.ok()
			.and_then(|v| v.parse::<bool>().ok())
			.unwrap_or(false);

		if !enabled {
			return None;
		}

		let client_id = env::var(OIDC_CLIENT_ID_KEY).unwrap_or_default();
		let issuer_url = env::var(OIDC_ISSUER_URL_KEY).unwrap_or_default();
		let client_secret = env::var(OIDC_CLIENT_SECRET_KEY).unwrap_or_default();

		if client_id.is_empty() || issuer_url.is_empty() || client_secret.is_empty() {
			tracing::warn!(
				"OIDC is enabled but missing required configuration (client_id, issuer_url, or client_secret)"
			);
			return None;
		}

		let scopes = env::var(OIDC_SCOPES_KEY).unwrap_or_else(|_| default_oidc_scopes());

		let mut scopes_set: Vec<String> = scopes
			.split(',')
			.map(|s| s.trim().to_string())
			.filter(|s| !s.is_empty())
			.collect();
		// Ensure required scopes are included
		for required_scope in REQUIRED_SCOPES.split(',') {
			if !scopes_set.contains(&required_scope.to_string()) {
				scopes_set.push(required_scope.to_string());
			}
		}
		let scopes = scopes_set.join(",");

		let allow_registration = env::var(OIDC_ALLOW_REGISTRATION_KEY)
			.ok()
			.and_then(|v| v.parse::<bool>().ok())
			.unwrap_or(true);
		let disable_local_auth = env::var(OIDC_DISABLE_LOCAL_AUTH_KEY)
			.ok()
			.and_then(|v| v.parse::<bool>().ok())
			.unwrap_or(false);

		Some(Self {
			enabled,
			client_id,
			issuer_url,
			client_secret,
			scopes,
			allow_registration,
			disable_local_auth,
		})
	}

	/// Check if OIDC is *properly* configured
	pub fn is_configured(&self) -> bool {
		self.enabled
			&& !self.client_id.is_empty()
			&& !self.issuer_url.is_empty()
			&& !self.client_secret.is_empty()
	}

	/// Get the scopes to use when requesting OIDC tokens
	pub fn get_scopes(&self) -> Vec<String> {
		self.scopes
			.split(',')
			.map(|s| s.trim().to_string())
			.filter(|s| !s.is_empty())
			.collect()
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_oidc_config_validation() {
		let config = OidcConfig {
			enabled: true,
			client_id: "test-client".to_string(),
			issuer_url: "https://example.com".to_string(),
			client_secret: "test-secret".to_string(),
			..Default::default()
		};

		assert!(config.is_configured());

		let invalid_config = OidcConfig {
			enabled: true,
			client_id: String::new(),
			issuer_url: String::new(),
			..Default::default()
		};

		assert!(!invalid_config.is_configured());
	}

	#[test]
	fn test_oidc_scopes_parsing() {
		let config = OidcConfig {
			scopes: "openid,email,profile".to_string(),
			..Default::default()
		};

		let scopes = config.get_scopes();
		assert_eq!(scopes.len(), 3);
		assert_eq!(scopes, vec!["openid", "email", "profile"]);
	}
}
