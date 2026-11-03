use crate::{data::CoreContext, guard::PermissionGuard};
use async_graphql::{Context, Object, Result};
use models::{entity::server_config, shared::enums::UserPermission};
use sea_orm::{prelude::*, ActiveValue::Set, IntoActiveModel};

#[derive(Default)]
pub struct ServerConfigMutation;

// TODO: add hook into refreshing JWT secrets, so that if somehow they were compromised we have a friendly way for
// folks to rotate em. it's stored in db so if compromised i think you have bigger problems, but still

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
		let trimmed = public_url.trim();
		config.public_url = Set(if trimmed.is_empty() {
			None
		} else {
			Some(trimmed.to_string())
		});
		// ^ empty urls would be invalid, but see also:
		// https://discord.com/channels/972593831172272148/1565087706252447865/1565087706252447865

		let updated_config = config.update(conn).await?;
		Ok(updated_config)
	}
}
