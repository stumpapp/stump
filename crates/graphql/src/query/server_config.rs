use async_graphql::{Context, Object, Result};
use models::{entity::server_config, shared::enums::UserPermission};
use sea_orm::EntityTrait;

use crate::{data::CoreContext, guard::PermissionGuard};

#[derive(Default)]
pub struct ServerConfigQuery;

#[Object]
impl ServerConfigQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn server_config(&self, ctx: &Context<'_>) -> Result<server_config::Model> {
		let core = ctx.data::<CoreContext>()?;

		let config = server_config::Entity::find()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Server configuration not found")?;

		Ok(config)
	}
}
