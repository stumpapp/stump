use chrono::Utc;
use models::{
	entity::{api_key, user::AuthUser},
	shared::{
		api_key::{APIKeyPermissions, API_KEY_PREFIX},
		enums::UserPermission,
	},
};
use prefixed_api_key::{PrefixedApiKey, PrefixedApiKeyController};

use crate::{CoreError, CoreResult};

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

pub struct APIKeyController {
	model: api_key::Model,
}

impl APIKeyController {
	pub fn new(model: api_key::Model) -> Self {
		Self { model }
	}

	pub fn validate(&self, token: &str) -> CoreResult<bool> {
		match self.model.expires_at {
			Some(expiration) if expiration < Utc::now() => return Ok(false),
			_ => {},
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

		let pak: PrefixedApiKey = token
			.try_into()
			.map_err(|_| CoreError::BadRequest("Invalid API key".to_string()))?;

		Ok(controller.check_hash(&pak, &self.model.long_token_hash))
	}

	pub fn resolve_permissions(&self, for_user: &AuthUser) -> Vec<UserPermission> {
		// This realistically should never happen, and might be worth an error
		if self.model.user_id != for_user.id {
			return vec![];
		}

		match &self.model.permissions {
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

#[cfg(test)]
mod tests {
	use models::shared::api_key::InheritPermissionValue;

	use super::*;

	fn create_test_key() -> api_key::Model {
		api_key::Model {
			id: 1,
			user_id: "oromei".to_string(),
			name: "Test Key".to_string(),
			permissions: APIKeyPermissions::Inherit(InheritPermissionValue::Inherit),
			created_at: Utc::now().into(),
			expires_at: None,
			last_used_at: None,
			long_token_hash: "test_hash".to_string(),
			short_token: "test_short".to_string(),
		}
	}

	#[test]
	fn test_validate() {
		let (pek, hash) = create_prefixed_key().expect("Failed to create key");
		let key = api_key::Model {
			long_token_hash: hash.clone(),
			..create_test_key()
		};
		let controller = APIKeyController::new(key);
		assert!(controller
			.validate(&pek.to_string())
			.expect("Failed to validate key"));
	}

	#[test]
	fn test_get_permits_wrong_user() {
		let (pek, hash) = create_prefixed_key().expect("Failed to create key");
		let key = api_key::Model {
			long_token_hash: hash.clone(),
			..create_test_key()
		};
		let user = AuthUser {
			id: "shadowfax".to_string(),
			permissions: vec![UserPermission::AccessAPIKeys],
			..Default::default()
		};
		let controller = APIKeyController::new(key);
		assert!(controller
			.validate(&pek.to_string())
			.expect("Failed to validate key"));
		assert_eq!(controller.resolve_permissions(&user), vec![]);
	}

	#[test]
	fn test_get_permits_inherit() {
		let (pek, hash) = create_prefixed_key().expect("Failed to create key");
		let key = api_key::Model {
			permissions: APIKeyPermissions::default(),
			long_token_hash: hash.clone(),
			..create_test_key()
		};
		let user = AuthUser {
			id: "oromei".to_string(),
			permissions: vec![UserPermission::AccessAPIKeys],
			..Default::default()
		};
		let controller = APIKeyController::new(key);
		assert!(controller
			.validate(&pek.to_string())
			.expect("Failed to validate key"));
		assert_eq!(
			controller.resolve_permissions(&user),
			vec![UserPermission::AccessAPIKeys]
		);
	}

	#[test]
	fn test_get_permits_custom() {
		let (pek, hash) = create_prefixed_key().expect("Failed to create key");
		let key = api_key::Model {
			permissions: APIKeyPermissions::Custom(vec![UserPermission::AccessBookClub]),
			long_token_hash: hash.clone(),
			..create_test_key()
		};
		let user = AuthUser {
			id: "oromei".to_string(),
			permissions: vec![
				UserPermission::AccessAPIKeys,
				UserPermission::AccessBookClub,
			],
			..Default::default()
		};
		let controller = APIKeyController::new(key);
		assert!(controller
			.validate(&pek.to_string())
			.expect("Failed to validate key"));
		assert_eq!(
			controller.resolve_permissions(&user),
			vec![UserPermission::AccessBookClub]
		);
	}
}
