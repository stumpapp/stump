use crate::{
	data::CoreContext,
	filter::{log::LogFilterInput, IntoFilter},
	guard::PermissionGuard,
	object::log::{Log, LogFileInfo},
	order::OrderSpec,
	pagination::{
		get_paginated_results, PaginatedResponse, Pagination, PaginationValidator,
	},
};
use async_graphql::{Context, Object, Result};
use models::{entity::log, shared::enums::UserPermission};
use sea_orm::{prelude::*, Order};

#[derive(Default)]
pub struct LogQuery;

#[Object]
impl LogQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn logs(
		&self,
		ctx: &Context<'_>,
		#[graphql(default)] filter: LogFilterInput,
		#[graphql(default)] order_by: Vec<log::LogModelOrderBy>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Log>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let filter = filter.into_filter();
		let query = order_by
			.iter()
			.fold(OrderSpec::new(), |spec, o| spec.by(&o.field, o.direction))
			.then(log::Column::Id, Order::Asc)
			.apply(log::Entity::find().filter(filter));

		let get_cursor = |m: &log::Model| m.id.to_string();
		get_paginated_results(query, log::Column::Id, conn, pagination, get_cursor).await
	}

	/// Get information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
	/// ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn logfile_info(&self, ctx: &Context<'_>) -> Result<LogFileInfo> {
		let config = ctx.data::<CoreContext>()?.config.as_ref();

		LogFileInfo::try_from(config).await
	}
}
