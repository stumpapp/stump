use crate::{
	data::CoreContext,
	filter::{log::LogFilterInput, IntoFilter},
	guard::PermissionGuard,
	object::log::LogDeleteOutput,
};
use async_graphql::{Context, Object, Result};
use models::{entity::log, shared::enums::UserPermission};
use sea_orm::prelude::*;
use std::fs::File;

#[derive(Default)]
pub struct LogMutation;

#[Object]
impl LogMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn delete_logs(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] filter: LogFilterInput,
	) -> Result<LogDeleteOutput> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let condition = filter.into_filter();
		let deleted_rows = log::Entity::delete_many()
			.filter(condition)
			.exec(conn)
			.await?;
		tracing::debug!("Deleted log entries");

		Ok(LogDeleteOutput {
			deleted: deleted_rows.rows_affected.try_into()?,
		})
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn delete_log_file(&self, ctx: &Context<'_>) -> Result<bool> {
		let log_file_path = ctx.data::<CoreContext>()?.config.get_log_file();
		File::create(log_file_path.as_path())?;
		Ok(true)
	}
}
