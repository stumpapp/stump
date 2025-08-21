use axum::{extract::State, Extension, Json};
use axum_extra::extract::Query;
use prisma_client_rust::{raw, Direction, PrismaValue};
use serde_qs::axum::QsQuery;
use stump_core::{
	db::{
		entity::Media,
		query::pagination::{
			PageQuery, Pageable, PageableMedia, Pagination, PaginationQuery,
		},
		CountQueryReturn,
	},
	prisma::{
		active_reading_session, finished_reading_session,
		media::{self, OrderByParam as MediaOrderByParam, WhereParam},
	},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{FilterableMediaQuery, FilterableQuery, MediaFilter},
	middleware::auth::AuthContext,
	routers::api::filters::{
		apply_media_age_restriction, apply_media_filters_for_user,
		apply_media_library_not_hidden_for_user_filter, apply_media_pagination,
	},
};

#[utoipa::path(
	get,
	path = "/api/v1/media",
	tag = "media",
	params(
		("filter_query" = Option<FilterableMediaQuery>, Query, description = "The optional media filters"),
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination options"),
	),
	responses(
		(status = 200, description = "Successfully fetched media", body = PageableMedia),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get all media accessible to the requester. This is a paginated request, and
/// has various pagination params available.
#[tracing::instrument(err, skip(ctx))]
pub(crate) async fn get_media(
	filter_query: QsQuery<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Pageable<Vec<Media>>>> {
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	tracing::trace!(?filters, ?ordering, ?pagination, "get_media");

	let db = &ctx.db;
	let user_id = req.id();

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters_for_user(filters, req.user());

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::active_user_reading_sessions::fetch(vec![
					active_reading_session::user_id::equals(user_id.clone()),
				]))
				.with(media::finished_user_reading_sessions::fetch(vec![
					finished_reading_session::user_id::equals(user_id),
				]))
				.with(media::metadata::fetch())
				.order_by(order_by_param);

			if !is_unpaged {
				match pagination_cloned {
					Pagination::Page(page_query) => {
						let (skip, take) = page_query.get_skip_take();
						query = query.skip(skip).take(take);
					},
					Pagination::Cursor(cursor_query) => {
						if let Some(cursor) = cursor_query.cursor {
							query = query.cursor(media::id::equals(cursor)).skip(1);
						}
						if let Some(limit) = cursor_query.limit {
							query = query.take(limit);
						}
					},
					_ => unreachable!(),
				}
			}

			let media = query
				.exec()
				.await?
				.into_iter()
				.map(|m| m.into())
				.collect::<Vec<Media>>();

			if is_unpaged {
				return Ok((media, None));
			}

			client
				.media()
				.count(where_conditions)
				.exec()
				.await
				.map(|count| (media, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((media, count, pagination))));
	}

	Ok(Json(Pageable::from(media)))
}

// FIXME: Either restrict this route to a permission OR include the user age restrictions / library restrictions...
#[utoipa::path(
	get,
	path = "/api/v1/media/duplicates",
	tag = "media",
	params(
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination options"),
	),
	responses(
		(status = 200, description = "Successfully fetched duplicate media", body = PageableMedia),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get all media with identical checksums. This heavily implies duplicate files,
/// however it is not a guarantee (checksums are generated from the first chunk of
/// the file, so if a 2 comic books had say the same first 6 pages it might return a
/// false positive). This is a paginated request, and has various pagination
/// params available, but hopefully you won't have that many duplicates ;D
pub(crate) async fn get_duplicate_media(
	pagination: Query<PageQuery>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Pageable<Vec<Media>>>> {
	if pagination.page.is_none() {
		return Err(APIError::BadRequest(
			"Pagination is required for this request".to_string(),
		));
	}

	let page_params = pagination.0.page_params();
	let page_bounds = page_params.get_page_bounds();
	let client = &ctx.db;

	let duplicated_media_page = client
		._query_raw::<Media>(raw!(
			r"
			SELECT * FROM media
			WHERE hash IN (
				SELECT hash FROM media GROUP BY hash HAVING COUNT(*) > 1
			)
			LIMIT {} OFFSET {}",
			PrismaValue::Int(page_bounds.take),
			PrismaValue::Int(page_bounds.skip)
		))
		.exec()
		.await?;

	let count_result = client
		._query_raw::<CountQueryReturn>(raw!(
			r"
			SELECT COUNT(*) as count FROM media
			WHERE hash IN (
				SELECT hash FROM media GROUP BY hash HAVING COUNT(*) s> 1
			)"
		))
		.exec()
		.await?;

	let result = if let Some(db_total) = count_result.first() {
		Ok(Pageable::with_count(
			duplicated_media_page,
			db_total.count,
			&page_params,
		))
	} else {
		Err(APIError::InternalServerError(
			"Failed to fetch duplicate media".to_string(),
		))
	};

	Ok(Json(result?))
}

#[utoipa::path(
	get,
	path = "/api/v1/media/in-progress",
	tag = "media",
	params(
		("pagination" = Option<PageQuery>, Query, description = "Pagination options")
	),
	responses(
		(status = 200, description = "Successfully fetched in progress media", body = PageableMedia),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get all media which the requester has progress for that is less than the
/// total number of pages available (i.e not completed).
pub(crate) async fn get_in_progress_media(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	pagination_query: Query<PaginationQuery>,
) -> APIResult<Json<Pageable<Vec<Media>>>> {
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let pagination = pagination_query.0.get();

	let pagination_cloned = pagination.clone();
	let is_unpaged = pagination.is_unpaged();

	let read_progress_filter = active_reading_session::user_id::equals(user_id.clone());
	let where_conditions = vec![media::active_user_reading_sessions::some(vec![
		read_progress_filter.clone(),
	])]
	.into_iter()
	.chain(apply_media_library_not_hidden_for_user_filter(user))
	.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
	.collect::<Vec<WhereParam>>();

	let (media, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::active_user_reading_sessions::fetch(vec![
					read_progress_filter,
				]))
				.with(media::metadata::fetch())
				// TODO: check back in -> https://github.com/prisma/prisma/issues/18188
				// FIXME: not the proper ordering, BUT I cannot order based on a relation...
				// I think this just means whenever progress updates I should update the media
				// updated_at field, but that's a bit annoying TBH...
				.order_by(media::updated_at::order(Direction::Desc));

			if !is_unpaged {
				query = apply_media_pagination(query, &pagination_cloned);
			}

			let media = query
				.exec()
				.await?
				.into_iter()
				.map(|m| m.into())
				.collect::<Vec<Media>>();

			if is_unpaged {
				return Ok((media, None));
			}

			client
				.media()
				.count(where_conditions)
				.exec()
				.await
				.map(|count| (media, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((media, count, pagination))));
	}

	Ok(Json(Pageable::from(media)))
}

#[utoipa::path(
	get,
	path = "/api/v1/media/recently-added",
	tag = "media",
	params(
		("pagination" = Option<PageQuery>, Query, description = "Pagination options")
	),
	responses(
		(status = 200, description = "Successfully fetched recently added media", body = PageableMedia),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get all media which was added to the library in descending order of when it
/// was added.
pub(crate) async fn get_recently_added_media(
	filter_query: QsQuery<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Pageable<Vec<Media>>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	tracing::trace!(?filters, ?pagination, "get_recently_added_media");

	let db = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();

	let is_unpaged = pagination.is_unpaged();

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters_for_user(filters, user);

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::active_user_reading_sessions::fetch(vec![
					active_reading_session::user_id::equals(user_id.clone()),
				]))
				.with(media::finished_user_reading_sessions::fetch(vec![
					finished_reading_session::user_id::equals(user_id),
				]))
				.with(media::metadata::fetch())
				.order_by(media::created_at::order(Direction::Desc));

			if !is_unpaged {
				query = apply_media_pagination(query, &pagination_cloned);
			}

			let media = query
				.exec()
				.await?
				.into_iter()
				.map(|m| m.into())
				.collect::<Vec<Media>>();

			if is_unpaged {
				return Ok((media, None));
			}

			client
				.media()
				.count(where_conditions)
				.exec()
				.await
				.map(|count| (media, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((media, count, pagination))));
	}

	Ok(Json(Pageable::from(media)))
}
