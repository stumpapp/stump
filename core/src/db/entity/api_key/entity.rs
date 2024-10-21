use prefixed_api_key::{PrefixedApiKey, PrefixedApiKeyController};
use prisma_client_rust::chrono::{DateTime, FixedOffset, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	db::entity::{User, UserPermission},
	prisma::api_key,
	CoreError, CoreResult,
};

pub const API_KEY_PREFIX: &str = "stump";

// Note: This is a hack to get untagged unit enums to work with serde/specta. See https://github.com/serde-rs/serde/issues/1560
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum InheritPermissionValue {
	#[serde(rename = "inherit")]
	Inherit,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum APIKeyPermissions {
	Inherit(InheritPermissionValue),
	Custom(Vec<UserPermission>),
}

impl APIKeyPermissions {
	pub fn inherit() -> Self {
		APIKeyPermissions::Inherit(InheritPermissionValue::Inherit)
	}
}

impl Default for APIKeyPermissions {
	fn default() -> Self {
		APIKeyPermissions::Inherit(InheritPermissionValue::Inherit)
	}
}

/// An API key which can be used to interact with the API. API keys are scoped to a user,
/// so all actions taken with an API key are done as if the user was taking them.
#[derive(Default, Debug, Clone, Serialize, Deserialize, Type)]
pub struct APIKey {
	/// The ID of the API key
	id: i32,
	/// The permissions for the API key, either inherited from the user or custom
	/// permissions set on the key
	permissions: APIKeyPermissions,
	/// The hashed long token for the API key
	#[serde(skip_serializing)]
	long_token_hash: String,
	/// The ID of the user which is associated with the API key
	#[serde(skip_serializing)]
	user_id: String,
	/// The date the API key was created
	created_at: DateTime<FixedOffset>,
	/// The date the API key was last used
	last_used_at: Option<DateTime<FixedOffset>>,
	/// The date the API key expires, if it does
	expires_at: Option<DateTime<FixedOffset>>,
}

// TODO: once library supports checking hash without prefix, just use the users username

impl APIKey {
	/// Create the prefxied key and hash used for creating a new API key
	pub fn create_prefixed_key() -> CoreResult<(PrefixedApiKey, String)> {
		let controller = PrefixedApiKeyController::configure()
			.prefix(API_KEY_PREFIX.to_owned())
			.seam_defaults()
			.finalize()
			.map_err(|e| {
				CoreError::InternalError(format!(
					"Failed to create API key controller: {}",
					e
				))
			})?;

		Ok(controller.generate_key_and_hash())
	}

	/// Validate a hash against the API key
	pub fn validate(&self, api_key: &str) -> CoreResult<bool> {
		if self.expires_at.map(|e| e < Utc::now()).unwrap_or(false) {
			return Ok(false);
		}

		let controller = PrefixedApiKeyController::configure()
			.prefix(API_KEY_PREFIX.to_owned())
			.seam_defaults()
			.finalize()
			.map_err(|e| {
				CoreError::InternalError(format!(
					"Failed to create API key controller: {}",
					e
				))
			})?;

		let pak: PrefixedApiKey = api_key
			.try_into()
			.map_err(|_| CoreError::BadRequest("Invalid API key".to_string()))?;

		Ok(controller.check_hash(&pak, &self.long_token_hash))
	}

	/// Get the permissions for the API key
	pub fn get_permits(&self, for_user: &User) -> Vec<UserPermission> {
		// This realistically should never happen, and might be worth an error
		if self.user_id != for_user.id {
			return vec![];
		}

		match &self.permissions {
			APIKeyPermissions::Inherit(_) => for_user.permissions.clone(),
			// If the user lacks a permission, they can't use it
			APIKeyPermissions::Custom(permissions) => permissions
				.iter()
				.filter(|perm| for_user.permissions.contains(perm))
				.cloned()
				.collect(),
		}
	}
}

impl TryFrom<api_key::Data> for APIKey {
	type Error = CoreError;

	fn try_from(data: api_key::Data) -> Result<Self, Self::Error> {
		Ok(APIKey {
			id: data.id,
			permissions: serde_json::from_slice(&data.permissions)?,
			long_token_hash: data.long_token_hash,
			user_id: data.user_id,
			created_at: data.created_at,
			last_used_at: data.last_used_at,
			expires_at: data.expires_at,
		})
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_deserialize_api_key_permissions() {
		let inherit = r#""inherit""#;
		let custom = r#"["feature:api_keys"]"#;

		let inherit: APIKeyPermissions =
			serde_json::from_str(inherit).expect("Failed to deserialize inherit");
		let custom: APIKeyPermissions =
			serde_json::from_str(custom).expect("Failed to deserialize custom");

		assert!(matches!(inherit, APIKeyPermissions::Inherit(_)));
		assert!(matches!(custom, APIKeyPermissions::Custom(_)));
	}

	#[test]
	fn test_serialize_api_key_permissions() {
		let inherit = APIKeyPermissions::Inherit(InheritPermissionValue::Inherit);
		let custom = APIKeyPermissions::Custom(vec![UserPermission::AccessAPIKeys]);

		let inherit =
			serde_json::to_string(&inherit).expect("Failed to serialize inherit");
		let custom = serde_json::to_string(&custom).expect("Failed to serialize custom");

		assert_eq!(inherit, r#""inherit""#);
		assert_eq!(custom, r#"["feature:api_keys"]"#);
	}

	#[test]
	fn test_validate() {
		let (pek, hash) = APIKey::create_prefixed_key().expect("Failed to create key");
		let key = APIKey {
			id: 1,
			user_id: "oromei".to_string(),
			long_token_hash: hash.clone(),
			..Default::default()
		};
		assert!(key
			.validate(&pek.to_string())
			.expect("Failed to validate key"));
	}

	#[test]
	fn test_get_permits_wrong_user() {
		let key = APIKey {
			id: 1,
			user_id: "oromei".to_string(),
			..Default::default()
		};
		let user = User {
			id: "shadowfax".to_string(),
			permissions: vec![UserPermission::AccessAPIKeys],
			..Default::default()
		};
		assert!(key.get_permits(&user).is_empty());
	}

	#[test]
	fn test_get_permits_inherit() {
		let key = APIKey {
			id: 1,
			user_id: "oromei".to_string(),
			permissions: APIKeyPermissions::default(),
			..Default::default()
		};
		let user = User {
			id: "oromei".to_string(),
			permissions: vec![UserPermission::AccessAPIKeys],
			..Default::default()
		};
		assert_eq!(key.get_permits(&user), vec![UserPermission::AccessAPIKeys]);
	}

	#[test]
	fn test_get_permits_custom() {
		let key = APIKey {
			id: 1,
			user_id: "oromei".to_string(),
			permissions: APIKeyPermissions::Custom(vec![UserPermission::AccessBookClub]),
			..Default::default()
		};
		let user = User {
			id: "oromei".to_string(),
			permissions: vec![
				UserPermission::AccessAPIKeys,
				UserPermission::AccessBookClub,
			],
			..Default::default()
		};
		assert_eq!(key.get_permits(&user), vec![UserPermission::AccessBookClub]);
	}
}
