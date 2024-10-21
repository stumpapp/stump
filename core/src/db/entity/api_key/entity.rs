use prefixed_api_key::{PrefixedApiKey, PrefixedApiKeyController};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	db::entity::{User, UserPermission},
	CoreError, CoreResult,
};

pub const API_KEY_PREFIX: &str = "stump";

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum APIKeyPermissions {
	#[serde(rename = "inherit")]
	Inherit,
	Custom(Vec<UserPermission>),
}

/// An API key which can be used to interact with the API. API keys are scoped to a user,
/// so all actions taken with an API key are done as if the user was taking them.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct APIKey {
	/// The ID of the API key
	id: i32,
	/// The permissions for the API key, either inherited from the user or custom
	/// permissions set on the key
	permissions: APIKeyPermissions,
	/// The short token for the API key
	#[serde(skip_serializing)]
	short_token: String,
	/// The hashed long token for the API key
	#[serde(skip_serializing)]
	long_token_hash: String,
	/// The ID of the user which is associated with the API key
	#[serde(skip_serializing)]
	user_id: String,
}

impl APIKey {
	/// Convert the [APIKey] into a [PrefixedApiKey] without ownership
	pub fn get_prefixed(&self) -> CoreResult<PrefixedApiKey> {
		format!(
			"{API_KEY_PREFIX}_{}_{}",
			self.short_token, self.long_token_hash
		)
		.as_str()
		.try_into()
		.map_err(|e| {
			CoreError::InternalError(format!("Failed to create prefixed key: {}", e))
		})
	}

	/// Validate a hash against the API key
	pub fn validate(&self, hash: &str) -> CoreResult<bool> {
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

		let pak = self.get_prefixed()?;
		Ok(controller.check_hash(&pak, hash))
	}

	/// Get the permissions for the API key
	pub fn get_permits(&self, for_user: &User) -> Vec<UserPermission> {
		// This realistically should never happen, and might be worth an error
		if self.user_id != for_user.id {
			return vec![];
		}

		match &self.permissions {
			APIKeyPermissions::Inherit => for_user.permissions.clone(),
			APIKeyPermissions::Custom(permissions) => permissions.clone(),
		}
	}
}
