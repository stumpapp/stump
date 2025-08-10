use std::collections::HashMap;

use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{finished_reading_session, media, reading_session, user::AuthUser},
	shared::{
		alphabet::{AvailableAlphabet, EntityLetter},
		ordering::OrderBy,
	},
};
use sea_orm::{
	prelude::*,
	sea_query::{ExprTrait, Query},
	Condition, DatabaseBackend, FromQueryResult, JoinType, QueryOrder, QuerySelect,
	Statement,
};

use crate::{
	data::{CoreContext, RequestContext},
	filter::{media::MediaFilterInput, IntoFilter},
	object::media::Media,
	order::MediaOrderBy,
	pagination::{
		CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
		PaginationValidator,
	},
};

#[derive(Default)]
pub struct MediaQuery;

pub fn should_add_sessions_join_for_filter(filter: &MediaFilterInput) -> bool {
	filter.reading_status.is_some()
		|| [&filter._and, &filter._or, &filter._not]
			.iter()
			.filter_map(|opt| opt.as_ref())
			.any(|filters| filters.iter().any(|f| f.reading_status.is_some()))
}

pub fn add_sessions_join_for_filter(
	user: &AuthUser,
	filter: &MediaFilterInput,
	query: Select<media::Entity>,
) -> Select<media::Entity> {
	let should_join_sessions = should_add_sessions_join_for_filter(filter);

	if should_join_sessions {
		let user_id = user.id.clone();
		let user_id_cpy = user_id.clone();
		query
			.join_rev(
				JoinType::LeftJoin,
				reading_session::Entity::belongs_to(media::Entity)
					.from(reading_session::Column::MediaId)
					.to(media::Column::Id)
					.on_condition(move |_left, _right| {
						Condition::all()
							.add(reading_session::Column::UserId.eq(user_id.clone()))
					})
					.into(),
			)
			.join_rev(
				JoinType::LeftJoin,
				finished_reading_session::Entity::belongs_to(media::Entity)
					.from(finished_reading_session::Column::MediaId)
					.to(media::Column::Id)
					.on_condition(move |_left, _right| {
						Condition::all().add(
							finished_reading_session::Column::UserId
								.eq(user_id_cpy.clone()),
						)
					})
					.into(),
			)
			.group_by(media::Column::Id)
	} else {
		query
	}
}

#[Object]
impl MediaQuery {
	async fn media(
		&self,
		ctx: &Context<'_>,
		filter: MediaFilterInput,
		#[graphql(default_with = "MediaOrderBy::default_vec()")] order_by: Vec<
			MediaOrderBy,
		>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let mut query = media::ModelWithMetadata::find_for_user(user);
		query = MediaOrderBy::add_order_by(&order_by, query)?;
		query = add_sessions_join_for_filter(user, &filter, query)
			.filter(filter.into_filter());

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(media::Column::Name);
				if let Some(ref id) = info.after {
					let media = media::Entity::find_for_user(user)
						.select_only()
						.column(media::Column::Name)
						.filter(media::Column::Id.eq(id.clone()))
						.into_model::<media::MediaNameCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(media.name);
				}
				cursor.first(info.limit);

				let models = cursor
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|m| m.media.id.clone()));
				let next_cursor = match models.last().map(|m| m.media.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	async fn media_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_by_id_for_user(id.to_string(), user)
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}

	async fn media_by_path(
		&self,
		ctx: &Context<'_>,
		path: String,
	) -> Result<Option<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Path.eq(path))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}

	/// Returns the available alphabet for all media in the server
	async fn media_alphabet(&self, ctx: &Context<'_>) -> Result<HashMap<String, i64>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query_result = conn
			.query_all(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r"
				SELECT
					substr(COALESCE(media_metadata.title, media.name), 1, 1) AS letter,
					COUNT(DISTINCT media.id) AS count
				FROM
					media
				LEFT JOIN media_metadata ON media.id = media_metadata.media_id
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

	pub(crate) async fn keep_reading(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let user_id = user.id.clone();
		// FIXME(sea-orm): I think this might be wrong, see https://github.com/SeaQL/sea-orm/issues/2407
		let query = media::ModelWithMetadata::find_for_user(user)
			.join_rev(
				JoinType::InnerJoin,
				reading_session::Entity::belongs_to(media::Entity)
					.from(reading_session::Column::MediaId)
					.to(media::Column::Id)
					.on_condition(move |_left, _right| {
						Condition::all()
							.add(reading_session::Column::UserId.eq(user_id.clone()))
					})
					.into(),
			)
			.order_by_desc(reading_session::Column::UpdatedAt);

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let user_id = user.id.clone();
				let mut cursor = query.cursor_by(reading_session::Column::UpdatedAt);
				if let Some(ref id) = info.after {
					let id = id.clone(); // Clone for closure on_condition
					let record = media::Entity::find_for_user(user)
						.select_only()
						.column(reading_session::Column::UpdatedAt)
						.join_rev(
							JoinType::InnerJoin,
							reading_session::Entity::belongs_to(media::Entity)
								.from(reading_session::Column::MediaId)
								.to(media::Column::Id)
								.on_condition(move |_left, _right| {
									Condition::all().add(
										reading_session::Column::UserId
											.eq(user_id.clone())
											.and(
												reading_session::Column::MediaId
													.eq(id.clone()),
											),
									)
								})
								.into(),
						)
						.into_model::<media::ReadingSessionUpdatedAtCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.desc().after(record.updated_at);
				}
				cursor.first(info.limit);

				let models = cursor
					.group_by(media::Column::Id)
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|m| m.media.id.clone()));
				let next_cursor = match models.last().map(|m| m.media.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	async fn recently_added_media(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = media::ModelWithMetadata::find_for_user(user);

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(media::Column::CreatedAt);
				if let Some(ref id) = info.after {
					let media = media::Entity::find_for_user(user)
						.select_only()
						.column(media::Column::CreatedAt)
						.filter(media::Column::Id.eq(id.clone()))
						.into_model::<media::MediaCreatedAtCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.desc().after(media.created_at);
				}
				cursor.first(info.limit);

				let models = cursor
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|m| m.media.id.clone()));
				let next_cursor = match models.last().map(|m| m.media.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
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
					.order_by_desc(media::Column::CreatedAt)
					.offset(info.offset())
					.limit(info.limit())
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.order_by_desc(media::Column::CreatedAt)
					.into_model::<media::ModelWithMetadata>()
					.all(conn)
					.await?;
				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	async fn duplicate_media(&self, ctx: &Context<'_>) -> Result<Vec<Media>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(
				media::Column::Hash.in_subquery(
					Query::select()
						.column(media::Column::Hash)
						.from(media::Entity)
						.add_group_by([Expr::col(media::Column::Hash).into()])
						.and_having(Expr::col(media::Column::Id).count().gt(1))
						.to_owned(),
				),
			)
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		Ok(models.into_iter().map(Media::from).collect())
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::{order::OrderByField, tests::common::*};
	use models::{entity::media_metadata, shared::ordering::OrderDirection};
	use pretty_assertions::assert_eq;
	use sea_orm::{sea_query::SqliteQueryBuilder, QuerySelect, QueryTrait};

	#[test]
	fn test_media_query() {
		let user = get_default_user();
		let query = media::ModelWithMetadata::find_for_user(&user);
		let order_by = vec![
			MediaOrderBy::Media(OrderByField {
				field: media::MediaModelOrdering::Name,
				direction: OrderDirection::Asc,
			}),
			MediaOrderBy::Metadata(OrderByField {
				field: media_metadata::MediaMetadataModelOrdering::MediaId,
				direction: OrderDirection::Desc,
			}),
		];

		let query = MediaOrderBy::add_order_by(&order_by, query).unwrap();
		let query = query
			.select_only()
			.into_query()
			.to_string(SqliteQueryBuilder);

		assert_eq!(
			query,
			r#"SELECT  FROM "media" LEFT JOIN "media_metadata" ON "media"."id" = "media_metadata"."media_id" INNER JOIN "series" ON "media"."series_id" = "series"."id" LEFT JOIN "series_metadata" ON "series_metadata"."series_id" = "series"."id" WHERE "series"."library_id" NOT IN (SELECT "library_id" FROM "library_exclusions" WHERE "library_exclusions"."user_id" = '42') ORDER BY "media"."name" ASC, "media_metadata"."media_id" DESC"#
		);
	}
}
