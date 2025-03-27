use crate::guard::PermissionGuard;
use crate::pagination::get_paginated_results;
use crate::{
	data::CoreContext,
	object::log::Log,
	pagination::{PaginatedResponse, Pagination, PaginationValidator},
};
use async_graphql::{Context, Object, Result};
use models::{entity::log, shared::enums::UserPermission};
use sea_orm::{prelude::*, QueryOrder};

#[derive(Default)]
pub struct LogQuery;

#[Object]
impl LogQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageLibrary)")]
	async fn logs(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Log>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		// TODO(graphql): implement order by param
		// TODO(graphql): implement filters
		let query = log::Entity::find().order_by_asc(log::Column::Id);
		let get_cursor = |m: &log::Model| m.id.to_string();
		get_paginated_results(query, log::Column::Id, conn, pagination, get_cursor).await
	}
}
