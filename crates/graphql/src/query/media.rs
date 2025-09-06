use std::collections::HashMap;

use async_graphql::{Context, Object, Result, ID};
use models::{
	entity::{
		finished_reading_session, media, media_metadata, reading_session, user::AuthUser,
	},
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
	data::{AuthContext, CoreContext},
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
		#[graphql(default)] filter: MediaFilterInput,
		#[graphql(default_with = "MediaOrderBy::default_vec()")] order_by: Vec<
			MediaOrderBy,
		>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let mut query = media::ModelWithMetadata::find_for_user(user);
		query = MediaOrderBy::add_order_by(&order_by, query)?;
		query = add_sessions_join_for_filter(user, &filter, query)
			.filter(filter.into_filter())
			.filter(media::Column::DeletedAt.is_null());

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(media::Column::Name);
				if let Some(ref id) = info.after {
					let media = media::Entity::find_for_user(user)
						.select_only()
						.column(media::Column::Name)
						.filter(
							media::Column::Id
								.eq(id.clone())
								.and(media::Column::DeletedAt.is_null()),
						)
						.into_model::<media::MediaNameCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(media.name);
				}
				// FIXME: Cursor ordering is broken
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
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_by_id_for_user(id.to_string(), user)
			.filter(media::Column::DeletedAt.is_null())
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
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(
				media::Column::Path
					.eq(path)
					.and(media::Column::DeletedAt.is_null()),
			)
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
				WHERE
					media.deleted_at IS NULL
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
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let user_id = user.id.clone();

		let query = media::Entity::apply_for_user(user, media::Entity::find())
			.select_also(reading_session::Entity)
			.filter(media::Column::DeletedAt.is_null())
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
			Pagination::Cursor(_) => {
				// FIXME: See https://github.com/SeaQL/sea-orm/issues/2407
				Err("Cursor pagination not supported for keepReading at this time".into())
				// let user_id = user.id.clone();
				// let mut cursor =
				// 	query.cursor_by_other(reading_session::Column::UpdatedAt);

				// if let Some(ref id) = info.after {
				// 	let id = id.clone(); // Clone for closure on_condition
				// 	let record = media::Entity::find_for_user(user)
				// 		.select_only()
				// 		.column(reading_session::Column::UpdatedAt)
				// 		.join_rev(
				// 			JoinType::InnerJoin,
				// 			reading_session::Entity::belongs_to(media::Entity)
				// 				.from(reading_session::Column::MediaId)
				// 				.to(media::Column::Id)
				// 				.on_condition(move |_left, _right| {
				// 					Condition::all().add(
				// 						reading_session::Column::UserId
				// 							.eq(user_id.clone())
				// 							.and(
				// 								reading_session::Column::MediaId
				// 									.eq(id.clone()),
				// 							),
				// 					)
				// 				})
				// 				.into(),
				// 		)
				// 		.into_model::<media::ReadingSessionUpdatedAtCmpSelect>()
				// 		.one(conn)
				// 		.await?
				// 		.ok_or("Cursor not found")?;
				// 	cursor.after(record.updated_at);
				// }
				// cursor.first(info.limit).desc();

				// let models = cursor
				// 	.group_by(media::Column::Id)
				// 	.into_model::<media::ModelWithMetadata>()
				// 	.all(conn)
				// 	.await?;
				// let current_cursor = info
				// 	.after
				// 	.or_else(|| models.first().map(|m| m.media.id.clone()));
				// let next_cursor = match models.last().map(|m| m.media.id.clone()) {
				// 	Some(id) if models.len() == info.limit as usize => Some(id),
				// 	_ => None,
				// };

				// Ok(PaginatedResponse {
				// 	nodes: models.into_iter().map(Media::from).collect(),
				// 	page_info: CursorPaginationInfo {
				// 		current_cursor,
				// 		next_cursor,
				// 		limit: info.limit,
				// 	}
				// 	.into(),
				// })
			},
			Pagination::Offset(info) => {
				let count = query.clone().count(conn).await?;

				let models = query
					.find_also_related(media_metadata::Entity)
					.offset(info.offset())
					.limit(info.limit())
					.all(conn)
					.await?
					.into_iter()
					.map(|(media, _session, metadata)| media::ModelWithMetadata {
						media,
						metadata,
					})
					.collect::<Vec<_>>();

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query
					.find_also_related(media_metadata::Entity)
					.all(conn)
					.await?
					.into_iter()
					.map(|(media, _session, metadata)| media::ModelWithMetadata {
						media,
						metadata,
					})
					.collect::<Vec<_>>();

				let count = models.len().try_into()?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Media::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	async fn on_deck(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let offset_info = match pagination.resolve() {
			Pagination::Offset(info) => info,
			_ => return Err("Only offset pagination is supported for onDeck".into()),
		};

		let user_id = user.id.clone();
		let limit = offset_info.limit();
		let offset = offset_info.offset();

		#[derive(Debug, FromQueryResult)]
		struct OnDeckMediaId {
			id: String,
		}

		let on_deck_media_ids =
			OnDeckMediaId::find_by_statement(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r#"
				WITH 
				-- Find all series where the user has read at least one book
				user_read_series AS (
					SELECT DISTINCT m.series_id 
					FROM media m
					JOIN finished_reading_sessions frs ON frs.media_id = m.id
					WHERE frs.user_id = ?
					AND m.series_id IS NOT NULL
				),

				-- Find all media IDs that user has read or is currently reading
				user_read_or_reading_media AS (
					SELECT media_id 
					FROM finished_reading_sessions
					WHERE user_id = ?
					
					UNION
					
					SELECT media_id 
					FROM reading_sessions
					WHERE user_id = ?
				),

				-- For each series, get last read date for sorting priority
				series_last_read AS (
					SELECT 
						m.series_id,
						MAX(frs.completed_at) as last_read_date
					FROM finished_reading_sessions frs
					JOIN media m ON m.id = frs.media_id
					WHERE frs.user_id = ?
					AND m.series_id IN (SELECT series_id FROM user_read_series)
					GROUP BY m.series_id
				),

				-- Find the first unread book for each series
				next_in_series AS (
					SELECT 
						m.id, 
						m.name,
						m.series_id,
						ROW_NUMBER() OVER(
							PARTITION BY m.series_id 
							ORDER BY m.name
						) as book_rank,
						COALESCE(srl.last_read_date, '1970-01-01') as series_last_read_date
					FROM 
						media m
					LEFT JOIN
						series_last_read srl ON srl.series_id = m.series_id
					WHERE 
						m.series_id IN (SELECT series_id FROM user_read_series)
						-- Exclude media that user has read or is currently reading
						AND m.id NOT IN (SELECT media_id FROM user_read_or_reading_media)
						AND m.deleted_at IS NULL
				)

				-- Get only the first book for each series
				SELECT 
					id
				FROM 
					next_in_series
				WHERE 
					book_rank = 1
				ORDER BY
					-- Most recently read series first
					series_last_read_date DESC
				LIMIT ?
				OFFSET ?
				"#,
				[
					user_id.clone().into(),
					user_id.clone().into(),
					user_id.clone().into(),
					user_id.clone().into(),
					limit.into(),
					offset.into(),
				],
			))
			.all(conn)
			.await?;

		let media_ids: Vec<String> =
			on_deck_media_ids.into_iter().map(|row| row.id).collect();

		if media_ids.is_empty() {
			return Ok(PaginatedResponse {
				nodes: vec![],
				page_info: OffsetPaginationInfo::new(offset_info, 0).into(),
			});
		}

		let mut media_map: HashMap<String, media::ModelWithMetadata> = HashMap::new();

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.is_in(media_ids.clone()))
			.into_model::<media::ModelWithMetadata>()
			.all(conn)
			.await?;

		for model in models {
			media_map.insert(model.media.id.clone(), model);
		}

		// Note: The requery likely lost original order, so manually reorder
		let ordered_results: Vec<Media> = media_ids
			.into_iter()
			.filter_map(|id| media_map.remove(&id))
			.map(Media::from)
			.collect();

		let total_count = conn
			.query_one(Statement::from_sql_and_values(
				DatabaseBackend::Sqlite,
				r#"
					-- Count total number of on deck items (for pagination)
					WITH 
					-- Find all series where the user has read at least one book
					user_read_series AS (
						SELECT DISTINCT m.series_id 
						FROM media m
						JOIN finished_reading_sessions frs ON frs.media_id = m.id
						WHERE frs.user_id = ?
						AND m.series_id IS NOT NULL
					),

					-- Find all media IDs that user has read or is currently reading
					user_read_or_reading_media AS (
						-- Media that user has finished
						SELECT media_id 
						FROM finished_reading_sessions
						WHERE user_id = ?
						
						UNION
						
						-- Media that user is currently reading
						SELECT media_id 
						FROM reading_sessions
						WHERE user_id = ?
					),

					-- Find the first unread book for each series
					next_in_series AS (
						SELECT 
							m.id, 
							ROW_NUMBER() OVER(
								PARTITION BY m.series_id 
								ORDER BY m.name
							) as book_rank
						FROM 
							media m
						WHERE 
							m.series_id IN (SELECT series_id FROM user_read_series)
							-- Exclude media that user has read or is currently reading
							AND m.id NOT IN (SELECT media_id FROM user_read_or_reading_media)
							-- Ensure the media is not deleted
							AND m.deleted_at IS NULL
					)

					-- Count only the first book for each series
					SELECT 
						COUNT(*) as count
					FROM 
						next_in_series
					WHERE 
						book_rank = 1
					"#,
				[
					user_id.clone().into(),
					user_id.clone().into(),
					user_id.into(),
				],
			))
			.await?
			.ok_or_else(|| async_graphql::Error::new("Failed to get count"))?
			.try_get::<i64>("", "count")?
			.try_into()?;

		Ok(PaginatedResponse {
			nodes: ordered_results,
			page_info: OffsetPaginationInfo::new(offset_info, total_count).into(),
		})
	}

	async fn recently_added_media(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Media>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::DeletedAt.is_null());

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(media::Column::CreatedAt);
				if let Some(ref id) = info.after {
					let media = media::Entity::find_for_user(user)
						.select_only()
						.column(media::Column::CreatedAt)
						.filter(
							media::Column::Id
								.eq(id.clone())
								.and(media::Column::DeletedAt.is_null()),
						)
						.into_model::<media::MediaCreatedAtCmpSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(media.created_at);
				}
				cursor.first(info.limit).desc();

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
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::DeletedAt.is_null())
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
