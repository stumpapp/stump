use async_graphql::{Context, Object, Result};
use models::{entity::api_key, shared::enums::UserPermission};
use sea_orm::prelude::*;

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	object::api_key::APIKey,
};

#[derive(Default)]
pub struct APIKeyQuery;

#[Object]
impl APIKeyQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn api_keys(&self, ctx: &Context<'_>) -> Result<Vec<APIKey>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let api_keys = api_key::Entity::find_for_user(user)
			.into_model::<api_key::Model>()
			.all(conn)
			.await?;

		Ok(api_keys.into_iter().map(APIKey::from).collect())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn api_key_by_id(&self, ctx: &Context<'_>, id: i32) -> Result<APIKey> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let api_key = api_key::Entity::find_for_user(user)
			.filter(api_key::Column::Id.eq(id))
			.into_model::<api_key::Model>()
			.one(conn)
			.await?
			.ok_or("API key not found")?;

		Ok(APIKey::from(api_key))
	}
}
