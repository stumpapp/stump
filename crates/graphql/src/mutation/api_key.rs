use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::api_key::APIKeyInput,
	object::api_key::{APIKey, CreatedAPIKey},
};
use async_graphql::{Context, Object, Result};
use models::entity::api_key;
use models::shared::{api_key::APIKeyPermissions, enums::UserPermission};
use sea_orm::{prelude::*, ActiveModelTrait};

#[derive(Default)]
pub struct APIKeyMutation;

#[Object]
impl APIKeyMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn create_api_key(
		&self,
		ctx: &Context<'_>,
		input: APIKeyInput,
	) -> Result<CreatedAPIKey> {
		let req_ctx = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		check_permissions(req_ctx, &input.permissions)?;

		let (active_model, secret) = input.into_create(&req_ctx.user)?;
		let result = active_model.insert(conn).await?;

		Ok(CreatedAPIKey {
			api_key: APIKey::from(result),
			secret,
		})
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn update_api_key(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: APIKeyInput,
	) -> Result<APIKey> {
		let req_ctx = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let user = &req_ctx.user;

		check_permissions(req_ctx, &input.permissions)?;

		let model = api_key::Entity::find_for_user(user)
			.filter(api_key::Column::Id.eq(id))
			.one(conn)
			.await?
			.ok_or_else(|| async_graphql::Error::new("API key not found"))?;

		let active_model = input.apply_updates(model)?;
		let result = active_model.update(conn).await?;

		Ok(APIKey::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn delete_api_key(&self, ctx: &Context<'_>, id: i32) -> Result<APIKey> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let model = api_key::Entity::find_for_user(user)
			.filter(api_key::Column::Id.eq(id))
			.one(conn)
			.await?
			.ok_or_else(|| async_graphql::Error::new("API key not found"))?;
		let _ = model.clone().delete(conn).await?;

		Ok(APIKey::from(model))
	}
}

fn check_permissions(
	req_ctx: &AuthContext,
	permissions: &APIKeyPermissions,
) -> Result<()> {
	if let APIKeyPermissions::Custom(permissions) = permissions {
		req_ctx.enforce_permissions(permissions).map_err(|e| {
			tracing::trace!(?e, "User does not have requested permissions");
			"You lack the required permissions".to_string()
		})?;
	}

	Ok(())
}
