use async_graphql::{Context, Object, Result};
use models::entity::series;
use sea_orm::{prelude::*, QueryOrder, QuerySelect};

use crate::{
	data::{CoreContext, RequestContext},
	object::series::Series,
	pagination::{
		CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
		PaginationValidator,
	},
};

#[derive(Default)]
pub struct SeriesQuery;

#[Object]
impl SeriesQuery {
	async fn series(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Series>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = series::ModelWithMetadata::find_for_user(user);

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(series::Column::Name);
				if let Some(ref id) = info.after {
					let series = series::ModelWithMetadata::find_for_user(user)
						.select_only()
						.column(series::Column::Name)
						.filter(series::Column::Id.eq(id.clone()))
						.into_model::<series::SeriesNameCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(series.name);
				}
				cursor.first(info.limit);

				let models = cursor
					.into_model::<series::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|result| result.series.id.clone()));
				let next_cursor =
					match models.last().map(|result| result.series.id.clone()) {
						Some(id) if models.len() == info.limit as usize => Some(id),
						_ => None,
					};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Series::from).collect(),
					page_info: CursorPaginationInfo {
						current_cursor,
						next_cursor,
						limit: info.limit,
					}
					.into(),
				})
			},
			Pagination::Offset(info) => {
				let count = query.clone().count(conn).await?;

				let models = query
					.offset(info.offset())
					.limit(info.limit())
					.into_model::<series::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Series::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.into_model::<series::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;
				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Series::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	async fn number_of_series(&self, ctx: &Context<'_>) -> Result<u64> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let count = series::Entity::find_for_user(user).count(conn).await?;
		Ok(count)
	}

	async fn recently_added_series(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Series>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = series::ModelWithMetadata::find_for_user(user);

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(series::Column::CreatedAt);
				if let Some(ref id) = info.after {
					let series = series::Entity::find_for_user(user)
						.select_only()
						.column(series::Column::CreatedAt)
						.filter(series::Column::Id.eq(id.clone()))
						.into_model::<series::SeriesCreatedAtCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.desc().after(series.created_at);
				}
				cursor.first(info.limit);

				let models = cursor
					.into_model::<series::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|m| m.series.id.clone()));
				let next_cursor =
					match models.last().map(|result| result.series.id.clone()) {
						Some(id) if models.len() == info.limit as usize => Some(id),
						_ => None,
					};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Series::from).collect(),
					page_info: CursorPaginationInfo {
						current_cursor,
						next_cursor,
						limit: info.limit,
					}
					.into(),
				})
			},
			Pagination::Offset(info) => {
				let count = query.clone().count(conn).await?;

				let models = query
					.order_by_desc(series::Column::CreatedAt)
					.offset(info.offset())
					.limit(info.limit())
					.into_model::<series::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Series::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.order_by_desc(series::Column::CreatedAt)
					.into_model::<series::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Series::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}
}
