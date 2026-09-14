use models::{
	entity::{api_key, user},
	shared::api_key::{APIKeyPermissions, InheritPermissionValue},
};
use sea_orm::{ActiveModelTrait, ActiveValue::Set};
use stump_core::api_key::create_prefixed_key;

use crate::common::TestApp;

pub async fn create_api_key_for_user(
	app: &TestApp,
	user: &user::Model,
	permissions: Option<APIKeyPermissions>,
) -> (String, api_key::Model) {
	let conn = app.conn();

	let (prefixed_key, hash) = create_prefixed_key().expect("failed to create API key");
	let api_key_string = prefixed_key.to_string();

	let api_key_model = api_key::ActiveModel {
		user_id: Set(user.id.clone()),
		name: Set("test-api-key".to_string()),
		short_token: Set(prefixed_key.short_token().to_string()),
		long_token_hash: Set(hash),
		permissions: Set(permissions
			.unwrap_or(APIKeyPermissions::Inherit(InheritPermissionValue::Inherit))),
		..Default::default()
	};

	let inserted_api_key = api_key_model
		.insert(conn)
		.await
		.expect("failed to insert API key");

	(api_key_string, inserted_api_key)
}
