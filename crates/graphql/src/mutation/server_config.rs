use crate::{data::CoreContext, guard::PermissionGuard};
use async_graphql::{Context, Object, Result};
use models::{entity::server_config, shared::enums::UserPermission};
use sea_orm::{prelude::*, ActiveValue::Set, IntoActiveModel};

#[derive(Default)]
pub struct ServerConfigMutation;

#[Object]
impl ServerConfigMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn update_public_url(
		&self,
		ctx: &Context<'_>,
		public_url: String,
	) -> Result<server_config::Model> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let config = server_config::Entity::find()
			.one(conn)
			.await?
			// Note: This would be a pretty critical bug
			.ok_or("Server configuration not found")?;

		let mut config = config.into_active_model();
		config.public_url = Set(Some(public_url));

		let updated_config = config.update(conn).await?;
		Ok(updated_config)
	}
}
