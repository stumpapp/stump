use crate::{
	data::CoreContext,
	guard::PermissionGuard,
	input::metadata_provider::{
		CreateMetadataProviderConfigInput, PatchMetadataProviderConfigInput,
	},
};
use async_graphql::{Context, Object, Result};
use models::{entity::metadata_provider_config, shared::enums::UserPermission};
use sea_orm::{prelude::*, TryIntoModel};

#[derive(Default)]
pub struct MetadataProviderMutation;

#[Object]
impl MetadataProviderMutation {
	// TODO: Do we actually care about duplicates? I feel like not, like why not? So for
	// now I'll leave as-is
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderManage)")]
	async fn create_metadata_provider(
		&self,
		ctx: &Context<'_>,
		input: CreateMetadataProviderConfigInput,
	) -> Result<metadata_provider_config::Model> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let active_model = input.try_into_active_model(&encryption_key).await?;
		let result = active_model.save(conn).await?.try_into_model()?;

		Ok(result)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderManage)")]
	async fn update_metadata_provider(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: PatchMetadataProviderConfigInput,
	) -> Result<metadata_provider_config::Model> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let existing = metadata_provider_config::Entity::find_by_id(id)
			.one(conn)
			.await?
			.ok_or("Metadata provider config not found")?;

		let active_model = input.apply_to_model(existing, &encryption_key).await?;
		let result = active_model.save(conn).await?.try_into_model()?;

		Ok(result)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataProviderManage)")]
	async fn delete_metadata_provider(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<metadata_provider_config::Model> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = metadata_provider_config::Entity::find_by_id(id)
			.one(conn)
			.await?
			.ok_or("Metadata provider config not found")?;

		metadata_provider_config::Entity::delete_by_id(id)
			.exec(conn)
			.await?;

		Ok(model)
	}
}
