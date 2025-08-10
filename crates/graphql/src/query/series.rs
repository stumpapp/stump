use std::collections::HashMap;

use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::series,
	shared::{
		alphabet::{AvailableAlphabet, EntityLetter},
		ordering::OrderBy,
	},
};
use sea_orm::{
	prelude::*, DatabaseBackend, FromQueryResult, QueryOrder, QuerySelect, Statement,
};

use crate::{
	data::{CoreContext, RequestContext},
	filter::{series::SeriesFilterInput, IntoFilter},
	object::series::Series,
	order::SeriesOrderBy,
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
		filter: SeriesFilterInput,
		#[graphql(default_with = "SeriesOrderBy::default_vec()")] order_by: Vec<
			SeriesOrderBy,
		>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Series>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let conditions = filter.into_filter();
		let query = SeriesOrderBy::add_order_by(
			&order_by,
			series::ModelWithMetadata::find_for_user(user).filter(conditions),
		)?;

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

	async fn series_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Series>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let model = series::ModelWithMetadata::find_for_user(user)
			.filter(series::Column::Id.eq(id.to_string()))
			.into_model::<series::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Series::from))
	}

	/// Returns the available alphabet for all series in the server
	async fn series_alphabet(&self, ctx: &Context<'_>) -> Result<HashMap<String, i64>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query_result = conn
			.query_all(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r"
				SELECT
					substr(COALESCE(series_metadata.title, series.name), 1, 1) AS letter,
					COUNT(DISTINCT series.id) AS count
				FROM
					series
				LEFT JOIN series_metadata ON series.id = series_metadata.series_id
				GROUP BY
					letter
				ORDER BY
					letter ASC;
				",
				[],
			))
			.await?;

		let result = query_result
			.into_iter()
			.map(|res| EntityLetter::from_query_result(&res, "").map_err(|e| e.into()))
			.collect::<Result<Vec<EntityLetter>>>()?;

		let alphabet = AvailableAlphabet::from(result);

		Ok(alphabet.get())
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
