use crate::{
	data::{CoreContext, RequestContext},
	guard::PermissionGuard,
	input::api_key::APIKeyInput,
	object::api_key::APIKey,
};
use async_graphql::{Context, Object, Result};
use models::entity::api_key;
use models::shared::{api_key::APIKeyPermissions, enums::UserPermission};
use sea_orm::{prelude::*, ActiveModelTrait, Set};

#[derive(Default)]
pub struct APIKeyMutation;

#[Object]
impl APIKeyMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn create_api_key(
		&self,
		ctx: &Context<'_>,
		input: APIKeyInput,
	) -> Result<APIKey> {
		let req_ctx = ctx.data::<RequestContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		check_permissions(&req_ctx, &input.permissions)?;

		let active_model = input.try_into_active_model(&req_ctx.user)?;
		let result = active_model.insert(conn).await?;

		Ok(APIKey::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn update_api_key(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: APIKeyInput,
	) -> Result<APIKey> {
		let req_ctx = ctx.data::<RequestContext>()?;
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let user = &req_ctx.user;

		check_permissions(&req_ctx, &input.permissions)?;

		let model = api_key::Entity::find_for_user(user)
			.filter(api_key::Column::Id.eq(id))
			.one(conn)
			.await?
			.ok_or_else(|| async_graphql::Error::new("API key not found"))?;

		let mut active_model = input.try_into_active_model(user)?;
		active_model.id = Set(model.id);
		let result = active_model.update(conn).await?;

		Ok(APIKey::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::AccessAPIKeys)")]
	async fn delete_api_key(&self, ctx: &Context<'_>, id: i32) -> Result<APIKey> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
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
	req_ctx: &RequestContext,
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
