use async_graphql::{InputObject, Result};
use chrono::{DateTime, FixedOffset};
use models::{
	entity::{api_key, user::AuthUser},
	shared::{
		api_key::{APIKeyPermissions, InheritPermissionValue},
		enums::UserPermission,
	},
};
use sea_orm::{ActiveValue::NotSet, Set};

#[derive(InputObject)]
pub struct APIKeyInput {
	/// The name of the API key
	pub name: String,
	/// The permissions that the API key should have
	pub permissions: APIKeyPermissions,
	/// The expiration date for the API key, if any
	pub expires_at: Option<DateTime<FixedOffset>>,
}

impl APIKeyInput {
	pub fn try_into_active_model(self, user: &AuthUser) -> Result<api_key::ActiveModel> {
		let (pek, hash) = stump_core::api_key::create_prefixed_key()?;

		Ok(api_key::ActiveModel {
			id: NotSet, // auto-incremented
			user_id: Set(user.id.clone()),
			name: Set(self.name),
			short_token: Set(pek.short_token().to_string()),
			long_token_hash: Set(hash),
			permissions: Set(self.permissions),
			created_at: Set(chrono::Utc::now().into()),
			expires_at: Set(self.expires_at),
			last_used_at: Set(None),
		})
	}
}
