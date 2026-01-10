use async_graphql::{Context, Object, Result, SimpleObject};
use models::shared::enums::UserPermission;
use stump_core::config::StumpConfig;

use crate::{data::CoreContext, guard::PermissionGuard};

#[derive(Default, SimpleObject)]
pub struct UploadConfig {
	enabled: bool,
	max_file_upload_size: usize,
}

#[derive(Default)]
pub struct ConfigQuery;

#[Object]
impl ConfigQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn stump_config(&self, ctx: &Context<'_>) -> Result<StumpConfig> {
		let config = ctx.data::<CoreContext>()?.config.as_ref();

		Ok(config.clone())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::UploadFile)")]
	async fn upload_config(&self, ctx: &Context<'_>) -> Result<UploadConfig> {
		let config = ctx.data::<CoreContext>()?.config.as_ref();
		Ok(UploadConfig {
			enabled: config.enable_upload,
			max_file_upload_size: config.max_file_upload_size,
		})
	}
}
