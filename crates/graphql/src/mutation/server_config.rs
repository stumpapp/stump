use crate::{data::CoreContext, guard::PermissionGuard};
use async_graphql::{Context, Object, Result};
use models::{entity::server_config, shared::enums::UserPermission};
use sea_orm::{prelude::*, ActiveValue::Set, IntoActiveModel};
use stump_core::utils::encryption::encrypt_string;

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

	/// Update the LLM configuration for the server. A `None` value for any
	/// argument means the corresponding field will remain unchanged, while an
	/// empty string will clear it. The API key is encrypted before being
	/// persisted and is never returned to clients.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn update_llm_config(
		&self,
		ctx: &Context<'_>,
		url: Option<String>,
		model_name: Option<String>,
		api_key: Option<String>,
	) -> Result<server_config::Model> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let config = server_config::Entity::find()
			.one(conn)
			.await?
			.ok_or("Server configuration not found")?;

		let mut config = config.into_active_model();

		if let Some(url) = url {
			config.llm_url = Set(if url.is_empty() { None } else { Some(url) });
		}

		if let Some(model_name) = model_name {
			config.llm_model_name = Set(if model_name.is_empty() {
				None
			} else {
				Some(model_name)
			});
		}

		if let Some(api_key) = api_key {
			if api_key.is_empty() {
				config.llm_encrypted_api_key = Set(None);
			} else {
				let encryption_key = core_ctx.get_encryption_key().await?;
				let encrypted_api_key = encrypt_string(&api_key, &encryption_key)?;
				config.llm_encrypted_api_key = Set(Some(encrypted_api_key));
			}
		}

		let updated_config = config.update(conn).await?;
		Ok(updated_config)
	}
}
