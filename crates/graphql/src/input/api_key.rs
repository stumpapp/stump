use async_graphql::{InputObject, Result};
use chrono::{DateTime, FixedOffset};
use models::{
	entity::{api_key, user::AuthUser},
	shared::api_key::APIKeyPermissions,
};
use sea_orm::{ActiveValue::NotSet, IntoActiveModel, Set};

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
	pub fn into_create(self, user: &AuthUser) -> Result<(api_key::ActiveModel, String)> {
		let (pek, hash) = stump_core::api_key::create_prefixed_key()?;

		let active_model = api_key::ActiveModel {
			id: NotSet, // auto-incremented
			user_id: Set(user.id.clone()),
			name: Set(self.name),
			short_token: Set(pek.short_token().to_string()),
			long_token_hash: Set(hash),
			permissions: Set(self.permissions),
			created_at: Set(chrono::Utc::now().into()),
			expires_at: Set(self.expires_at),
			last_used_at: Set(None),
		};

		Ok((active_model, pek.to_string()))
	}

	pub fn apply_updates(self, model: api_key::Model) -> Result<api_key::ActiveModel> {
		let mut active_model = model.into_active_model();
		active_model.name = Set(self.name);
		active_model.permissions = Set(self.permissions);
		active_model.expires_at = Set(self.expires_at);
		Ok(active_model)
	}
}
