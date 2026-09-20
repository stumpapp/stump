use std::collections::HashMap;

use async_graphql::SimpleObject;
use models::shared::enums::UserPermission;
use schematic::Config;
use serde::Serialize;

// see https://moonrepo.github.io/schematic/config/struct/env.html#nested-prefixes, tldr;
// child structs require their own env_prefix
/// OIDC authentication configuration
#[derive(Config, Serialize, Clone, PartialEq, SimpleObject)]
#[config(env_prefix = "STUMP_OIDC_")]
pub struct OidcConfig {
	/// Whether to enable OIDC authentication
	#[setting(default = true)]
	// ^ default = true because if this struct is present without `enabled` set
	// we assume first boot
	pub enabled: bool,

	/// The OIDC provider client ID
	pub client_id: String,

	/// The OIDC provider issuer URL (e.g., https://accounts.provider.com)
	pub issuer_url: String,

	/// The client secret
	pub client_secret: String,

	/// Additional scopes to request (comma-separated)
	/// Defaults to "openid,email,profile"
	#[setting(
		default = vec!["openid".to_string(), "email".to_string(), "profile".to_string()],
		parse_env = schematic::env::split_comma
	)]
	pub scopes: Vec<String>,
	/// The claim name containing the user's group memberships
	#[setting(default = "groups".to_string())]
	#[graphql(skip)]
	pub groups_claim: String,
	/// Maps provider group names to Stump permissions. If empty, permissions are
	/// not managed by OIDC at all
	#[serde(default)]
	#[graphql(skip)] // HashMap is not a SimpleObject
	pub group_permission_mapping: HashMap<String, Vec<UserPermission>>,
	/// Allow automatic user registration via OIDC
	#[setting(default = true)]
	pub allow_registration: bool,

	/// Disable local password authentication when OIDC is enabled
	#[setting(default = false)]
	pub disable_local_auth: bool,

	/// Additional trusted audiences for ID token verification (comma-separated in env)
	#[setting(
		default = vec![],
		env = "STUMP_OIDC_EXTRA_AUDIENCES",
		parse_env = schematic::env::split_comma
	)]
	pub extra_audiences: Vec<String>,

	/// Path to a CA certificate file (PEM-encoded) to trust when connecting to the OIDC issuer
	pub ca_cert_file: Option<String>,
}

impl OidcConfig {
	pub fn is_valid(&self) -> bool {
		let is_configured_properly = self.enabled
			&& !self.client_id.is_empty()
			&& !self.issuer_url.is_empty()
			&& !self.client_secret.is_empty();
		if !is_configured_properly && self.enabled {
			tracing::warn!(
				client_id = ?self.client_id,
				issuer_url = ?self.issuer_url,
				client_secret_set = !self.client_secret.is_empty(),
				"OIDC is enabled but not properly configured (client_id, issuer_url, and client_secret are required)"
			);
		}
		}
		is_configured_properly
	}
}


impl std::fmt::Debug for OidcConfig {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		f.debug_struct("OidcConfig")
			.field("enabled", &self.enabled)
			.field("client_id", &self.client_id)
			.field("issuer_url", &self.issuer_url)
			.field("client_secret", &"[REDACTED]")
			.field("scopes", &self.scopes)
			.field("groups_claim", &self.groups_claim)
			.field("group_permission_mapping", &self.group_permission_mapping)
			.field("allow_registration", &self.allow_registration)
			.field("disable_local_auth", &self.disable_local_auth)
			.field("extra_audiences", &self.extra_audiences)
			.field("ca_cert_file", &self.ca_cert_file)
			.finish()
	}
}

impl OidcConfig {
	/// Get the extra trusted audiences for ID token verification, if any
	pub fn get_extra_audiences(&self) -> Vec<String> {
		self.extra_audiences.clone()
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_oidc_config_is_valid() {
		let config = OidcConfig {
			enabled: true,
			client_id: "test-client".to_string(),
			issuer_url: "https://example.com".to_string(),
			client_secret: "test-secret".to_string(),
			..Default::default()
		};

		assert!(config.is_valid());

		let invalid_config = OidcConfig {
			enabled: true,
			client_id: String::new(),
			issuer_url: String::new(),
			..Default::default()
		};

		assert!(!invalid_config.is_valid());
	}
}
