use std::{path::PathBuf, sync::Arc};

use axum::{
	extract::{DefaultBodyLimit, Multipart, Path, State},
	middleware,
	routing::{get, post, put},
	Extension, Json, Router,
};
use axum_extra::extract::Query;
use prisma_client_rust::{
	and,
	chrono::Duration,
	operator::{self, or},
	or, raw, Direction, PrismaValue,
};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use stump_core::{
	config::StumpConfig,
	db::{
		entity::{
			macros::{
				finished_reading_session_with_book_pages, reading_session_with_book_pages,
			},
			ActiveReadingSession, FinishedReadingSession, LibraryOptions, Media,
			PageDimension, PageDimensionsEntity, ProgressUpdateReturn, User,
			UserPermission,
		},
		query::pagination::{PageQuery, Pageable, Pagination, PaginationQuery},
		CountQueryReturn,
	},
	filesystem::{
		analyze_media_job::AnalyzeMediaJob,
		get_page_async, get_thumbnail,
		image::{
			generate_book_thumbnail, place_thumbnail, remove_thumbnails,
			GenerateThumbnailOptions, ImageFormat, ImageProcessorOptions,
		},
		ContentType,
	},
	prisma::{
		active_reading_session, finished_reading_session, library, library_options,
		media::{self, OrderByParam as MediaOrderByParam, WhereParam},
		media_metadata, series, series_metadata, tag, user, PrismaClient,
	},
	Ctx,
};
use tokio::fs;
use tracing::error;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{
		chain_optional_iter, decode_path_filter, FilterableQuery, MediaBaseFilter,
		MediaFilter, MediaRelationFilter, ReadStatus,
	},
	middleware::auth::{auth_middleware, RequestContext},
	utils::{
		http::{ImageResponse, NamedFile},
		validate_image_upload,
	},
};

use super::{
	library::library_not_hidden_from_user_filter,
	metadata::apply_media_metadata_base_filters, series::apply_series_filters,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/media", get(get_media))
		.route("/media/duplicates", get(get_duplicate_media))
		.route("/media/keep-reading", get(get_in_progress_media))
		.route("/media/recently-added", get(get_recently_added_media))
		.route("/media/path/:path", get(get_media_by_path))
		.nest(
			"/media/:id",
			Router::new()
				.route("/", get(get_media_by_id))
				.route("/file", get(get_media_file))
				.route("/convert", get(convert_media))
				.route(
					"/thumbnail",
					get(get_media_thumbnail_handler)
						.patch(patch_media_thumbnail)
						.post(replace_media_thumbnail)
						// TODO: configurable max file size
						.layer(DefaultBodyLimit::max(20 * 1024 * 1024)), // 20MB
				)
				.route("/analyze", post(start_media_analysis))
				.route("/page/:page", get(get_media_page))
				.route(
					"/progress",
					get(get_media_progress).delete(delete_media_progress),
				)
				.route("/progress/:page", put(update_media_progress))
				.route(
					"/progress/complete",
					get(get_is_media_completed).put(put_media_complete_status),
				)
				.route("/dimensions", get(get_media_dimensions))
				.route("/page/:page/dimensions", get(get_media_page_dimensions)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

pub(crate) fn apply_media_read_status_filter(
	user_id: String,
	read_status: Vec<ReadStatus>,
) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[(!read_status.is_empty()).then(|| {
			or(read_status
				.into_iter()
				.map(|rs| match rs {
					ReadStatus::Reading => {
						media::active_user_reading_sessions::some(vec![and![
							active_reading_session::user_id::equals(user_id.clone()),
						]])
					},
					ReadStatus::Completed => {
						media::finished_user_reading_sessions::some(vec![and![
							finished_reading_session::user_id::equals(user_id.clone()),
						]])
					},
					ReadStatus::Unread => {
						and![
							media::active_user_reading_sessions::none(vec![
								active_reading_session::user_id::equals(user_id.clone()),
							]),
							media::finished_user_reading_sessions::none(vec![
								finished_reading_session::user_id::equals(
									user_id.clone()
								),
							])
						]
					},
				})
				.collect())
		})],
	)
}

pub(crate) fn apply_media_base_filters(filters: MediaBaseFilter) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			(!filters.id.is_empty()).then(|| media::id::in_vec(filters.id)),
			(!filters.name.is_empty()).then(|| media::name::in_vec(filters.name)),
			(!filters.extension.is_empty())
				.then(|| media::extension::in_vec(filters.extension)),
			(!filters.path.is_empty()).then(|| {
				let decoded_paths = decode_path_filter(filters.path);
				media::path::in_vec(decoded_paths)
			}),
			(!filters.tags.is_empty())
				.then(|| media::tags::some(vec![tag::name::in_vec(filters.tags)])),
			filters.search.map(|s| {
				or![
					media::name::contains(s.clone()),
					media::metadata::is(vec![or![
						media_metadata::title::contains(s.clone()),
						media_metadata::summary::contains(s),
					]])
				]
			}),
			filters
				.metadata
				.map(apply_media_metadata_base_filters)
				.map(media::metadata::is),
		],
	)
}

pub(crate) fn apply_media_relation_filters(
	filters: MediaRelationFilter,
) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[filters
			.series
			.map(apply_series_filters)
			.map(media::series::is)],
	)
}

pub(crate) fn apply_media_filters(filters: MediaFilter) -> Vec<WhereParam> {
	apply_media_base_filters(filters.base_filter)
		.into_iter()
		.chain(apply_media_relation_filters(filters.relation_filter))
		.collect()
}

pub(crate) fn apply_media_library_not_hidden_for_user_filter(
	user: &User,
) -> Vec<WhereParam> {
	vec![media::series::is(vec![series::library::is(vec![
		library_not_hidden_from_user_filter(user),
	])])]
}

pub(crate) fn apply_media_filters_for_user(
	filters: MediaFilter,
	user: &User,
) -> Vec<WhereParam> {
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let read_status_filters = filters.base_filter.read_status.clone();
	let base_filters = operator::and(
		apply_media_filters(filters)
			.into_iter()
			.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
			.chain(apply_media_read_status_filter(user_id, read_status_filters))
			.collect::<Vec<WhereParam>>(),
	);

	// TODO: This is not ideal, I am adding an _additional_ relation filter for
	// the library exclusion, when I need to merge any requested filters with this one,
	// instead. This was a regression from the exclusion feature I need to tackle
	vec![and![
		base_filters,
		media::series::is(vec![series::library::is(vec![
			library_not_hidden_from_user_filter(user),
		])])
	]]
}

pub(crate) fn apply_media_pagination<'a>(
	query: media::FindMany<'a>,
	pagination: &Pagination,
) -> media::FindMany<'a> {
	match pagination {
		Pagination::Page(page_query) => {
			let (skip, take) = page_query.get_skip_take();
			query.skip(skip).take(take)
		},
		Pagination::Cursor(cursor_params) => {
			let mut cursor_query = query;
			if let Some(cursor) = cursor_params.cursor.as_deref() {
				cursor_query = cursor_query
					.cursor(media::id::equals(cursor.to_string()))
					.skip(1);
			}
			if let Some(limit) = cursor_params.limit {
				cursor_query = cursor_query.take(limit);
			}
			cursor_query
		},
		_ => query,
	}
}

/// Generates a single where condition for a media progress query to enforce media which
/// is currently in progress
pub(crate) fn apply_in_progress_filter_for_user(
	user_id: String,
) -> active_reading_session::WhereParam {
	and![
		active_reading_session::user_id::equals(user_id),
		or![
			active_reading_session::page::gt(0),
			active_reading_session::epubcfi::not(None),
		]
	]
}

/// Generates a condition to enforce age restrictions on media and their corresponding
/// series.
pub(crate) fn apply_media_age_restriction(
	min_age: i32,
	restrict_on_unset: bool,
) -> WhereParam {
	if restrict_on_unset {
		or![
			// If the media has no age rating, then we can defer to the series age rating.
			and![
				media::metadata::is(vec![media_metadata::age_rating::equals(None)]),
				media::series::is(vec![series::metadata::is(vec![
					series_metadata::age_rating::not(None),
					series_metadata::age_rating::lte(min_age),
				])])
			],
			// If the media has an age rating, it must be under the user age restriction
			media::metadata::is(vec![
				media_metadata::age_rating::not(None),
				media_metadata::age_rating::lte(min_age),
			]),
		]
	} else {
		or![
			// If there is no media metadata at all, or it exists with no age rating, then we
			// should try to defer to the series age rating
			and![
				or![
					media::metadata::is_null(),
					media::metadata::is(vec![media_metadata::age_rating::equals(None)])
				],
				media::series::is(vec![or![
					// If the series has no metadata, then we can allow the media
					series::metadata::is_null(),
					// Or if the series has an age rating and it is under the user age restriction
					series::metadata::is(vec![
						series_metadata::age_rating::not(None),
						series_metadata::age_rating::lte(min_age),
					]),
					// Or if the series has no age rating, then we can allow the media
					series::metadata::is(vec![series_metadata::age_rating::equals(None)])
				]])
			],
			// If the media has an age rating, it must be under the user age restriction
			media::metadata::is(vec![
				media_metadata::age_rating::not(None),
				media_metadata::age_rating::lte(min_age),
			]),
		]
	}
}

pub fn apply_media_restrictions_for_user(user: &User) -> Vec<WhereParam> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	chain_optional_iter(
		[media::series::is(vec![series::library::is(vec![
			library_not_hidden_from_user_filter(user),
		])])],
		[age_restrictions],
	)
}

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
#[tracing::instrument(err, ret, skip(ctx))]
async fn get_media(
	filter_query: QsQuery<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
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
							query = query.cursor(media::id::equals(cursor)).skip(1)
						}
						if let Some(limit) = cursor_query.limit {
							query = query.take(limit)
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
async fn get_duplicate_media(
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
			r#"
			SELECT * FROM media
			WHERE hash IN (
				SELECT hash FROM media GROUP BY hash HAVING COUNT(*) > 1
			)
			LIMIT {} OFFSET {}"#,
			PrismaValue::Int(page_bounds.take),
			PrismaValue::Int(page_bounds.skip)
		))
		.exec()
		.await?;

	let count_result = client
		._query_raw::<CountQueryReturn>(raw!(
			r#"
			SELECT COUNT(*) as count FROM media
			WHERE hash IN (
				SELECT hash FROM media GROUP BY hash HAVING COUNT(*) s> 1
			)"#
		))
		.exec()
		.await?;

	let result = if let Some(db_total) = count_result.first() {
		Ok(Pageable::with_count(
			duplicated_media_page,
			db_total.count,
			page_params,
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
async fn get_in_progress_media(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
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
async fn get_recently_added_media(
	filter_query: QsQuery<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	Extension(req): Extension<RequestContext>,
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

#[utoipa::path(
	get,
	path = "/api/v1/media/path/:path",
	tag = "media",
	params(
		("path" = PathBuf, Path, description = "The path of the media to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media", body = Media),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_media_by_path(
	Path(path): Path<PathBuf>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Media>> {
	let client = &ctx.db;

	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let path_str = path.to_string_lossy().to_string();
	let required_params = [media::path::equals(path_str.clone())]
		.into_iter()
		.chain(apply_media_library_not_hidden_for_user_filter(user))
		.collect::<Vec<WhereParam>>();

	let book = client
		.media()
		.find_first(chain_optional_iter(required_params, [age_restrictions]))
		.with(media::metadata::fetch())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	Ok(Json(Media::from(book)))
}

#[derive(Deserialize)]
struct BookRelations {
	#[serde(default)]
	load_series: Option<bool>,
	#[serde(default)]
	load_library: Option<bool>,
}

#[utoipa::path(
	get,
	path = "/api/v1/media/:id",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get"),
		("load_series" = Option<bool>, Query, description = "Whether to load the series relation for the media")
	),
	responses(
		(status = 200, description = "Successfully fetched media", body = Media),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get a media by its ID. If provided, the `load_series` query param will load
/// the series relation for the media.
async fn get_media_by_id(
	Path(id): Path<String>,
	params: Query<BookRelations>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Media>> {
	let db = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let mut query = db
		.media()
		.find_first(where_params)
		.with(media::active_user_reading_sessions::fetch(vec![
			active_reading_session::user_id::equals(user_id.clone()),
		]))
		.with(media::finished_user_reading_sessions::fetch(vec![
			finished_reading_session::user_id::equals(user_id),
		]))
		.with(media::metadata::fetch());

	if params.load_series.unwrap_or_default() {
		tracing::trace!(media_id = id, "Loading series relation for media");
		query = query.with(if params.load_library.unwrap_or_default() {
			media::series::fetch()
				.with(series::metadata::fetch())
				.with(series::library::fetch())
		} else {
			media::series::fetch().with(series::metadata::fetch())
		});
	}

	let media = query
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	Ok(Json(Media::from(media)))
}

// TODO: type a body
#[utoipa::path(
	get,
	path = "/api/v1/media/:id/file",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully fetched media file"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Download the file associated with the media.
async fn get_media_file(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<NamedFile> {
	let db = &ctx.db;

	let user = req.user_and_enforce_permissions(&[UserPermission::DownloadFile])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_conditions = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let media = db
		.media()
		.find_first(where_conditions)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	tracing::trace!(?media, "Downloading media file");

	Ok(NamedFile::open(media.path.clone()).await?)
}

#[utoipa::path(
	get,
	path = "/api/v1/media/:id/convert",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully converted media"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
// TODO: remove this, implement it? maybe?
/// Converts a media file to a different format. Currently UNIMPLEMENTED.
async fn convert_media(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> Result<(), APIError> {
	let db = &ctx.db;

	// TODO: if keeping, enforce permission
	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let media = db
		.media()
		.find_first(where_params)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	if media.extension != "cbr" || media.extension != "rar" {
		return Err(APIError::BadRequest(String::from(
			"Stump only supports RAR to ZIP conversions at this time",
		)));
	}

	Err(APIError::NotImplemented)
}

// TODO: ImageResponse as body type
#[utoipa::path(
	get,
	path = "/api/v1/media/:id/page/:page",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get"),
		("page" = i32, Path, description = "The page to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get a page of a media
async fn get_media_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<ImageResponse> {
	let db = &ctx.db;

	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let media = db
		.media()
		.find_first(where_params)
		.with(media::active_user_reading_sessions::fetch(vec![
			active_reading_session::user_id::equals(user_id),
		]))
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	if page > media.pages {
		Err(APIError::BadRequest(format!(
			"Page {} is out of bounds for media {}",
			page, id
		)))
	} else {
		Ok(get_page_async(&media.path, page, &ctx.config).await?.into())
	}
}

// TODO: Refactor this transaction. I must have been very tired when I wrote it lol
// No thoughts, head empty
pub(crate) async fn get_media_thumbnail_by_id(
	id: String,
	db: &PrismaClient,
	user: &User,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let result = db
		._transaction()
		.run(|client| async move {
			let book = client
				.media()
				.find_first(where_params)
				.order_by(media::name::order(Direction::Asc))
				.with(media::series::fetch())
				.exec()
				.await?;

			if let Some(book) = book {
				let library_id = match book.series() {
					Ok(Some(series)) => Some(series.library_id.clone()),
					_ => None,
				}
				.flatten();

				client
					.library_options()
					.find_first(vec![library_options::library_id::equals(library_id)])
					.exec()
					.await
					.map(|options| (Some(book), options.map(LibraryOptions::from)))
			} else {
				Ok((None, None))
			}
		})
		.await?;
	tracing::trace!(?result, "get_media_thumbnail transaction completed");

	match result {
		(Some(book), Some(options)) => {
			get_media_thumbnail(
				&book,
				options.thumbnail_config.map(|config| config.format),
				config,
			)
			.await
		},
		(Some(book), None) => get_media_thumbnail(&book, None, config).await,
		_ => Err(APIError::NotFound(String::from("Media not found"))),
	}
}

pub(crate) async fn get_media_thumbnail(
	media: &media::Data,
	image_format: Option<ImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let media_id = media.id.clone();

	let generated_thumb =
		get_thumbnail(config.get_thumbnails_dir(), &media_id, image_format).await?;

	if let Some((content_type, bytes)) = generated_thumb {
		Ok((content_type, bytes))
	} else {
		Ok(get_page_async(media.path.as_str(), 1, config).await?)
	}
}

// TODO: ImageResponse as body type
#[utoipa::path(
	get,
	path = "/api/v1/media/:id/thumbnail",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully fetched media thumbnail"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get the thumbnail image of a media
async fn get_media_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<ImageResponse> {
	let db = &ctx.db;
	get_media_thumbnail_by_id(id, db, req.user(), &ctx.config)
		.await
		.map(ImageResponse::from)
}

#[derive(Deserialize, ToSchema, specta::Type)]
pub struct PatchMediaThumbnail {
	page: i32,
	#[specta(optional)]
	is_zero_based: Option<bool>,
}

#[utoipa::path(
    patch,
    path = "/api/v1/media/:id/thumbnail",
    tag = "media",
    params(
        ("id" = String, Path, description = "The ID of the media")
    ),
    responses(
        (status = 200, description = "Successfully updated media thumbnail"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Media not found"),
        (status = 500, description = "Internal server error"),
    )
)]
async fn patch_media_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	Json(body): Json<PatchMediaThumbnail>,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let client = &ctx.db;

	let target_page = body
		.is_zero_based
		.map(|is_zero_based| {
			if is_zero_based {
				body.page + 1
			} else {
				body.page
			}
		})
		.unwrap_or(body.page);

	let media = client
		.media()
		.find_first(where_params)
		.with(
			media::series::fetch()
				.with(series::library::fetch().with(library::library_options::fetch())),
		)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	if media.extension == "epub" {
		return Err(APIError::NotSupported);
	}

	let library = media
		.series()?
		.ok_or(APIError::NotFound(String::from("Series relation missing")))?
		.library()?
		.ok_or(APIError::NotFound(String::from("Library relation missing")))?;
	let image_options = library
		.library_options()?
		.thumbnail_config
		.to_owned()
		.map(ImageProcessorOptions::try_from)
		.transpose()?
		.unwrap_or_else(|| {
			tracing::warn!(
				"Failed to parse existing thumbnail config! Using a default config"
			);
			ImageProcessorOptions::default()
		})
		.with_page(target_page);

	let format = image_options.format.clone();
	let (_, path_buf, _) = generate_book_thumbnail(
		&media,
		GenerateThumbnailOptions {
			image_options,
			core_config: ctx.config.as_ref().clone(),
			force_regen: true,
		},
	)
	.await?;

	Ok(ImageResponse::from((
		ContentType::from(format),
		fs::read(path_buf).await?,
	)))
}

#[utoipa::path(
	post,
	path = "/api/v1/media/:id/thumbnail",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully replaced media thumbnail"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn replace_media_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	mut upload: Multipart,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);
	let client = &ctx.db;

	let media = client
		.media()
		.find_first(where_params)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	let (content_type, bytes) = validate_image_upload(&mut upload).await?;
	let ext = content_type.extension();
	let book_id = media.id;

	// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
	// user testing I'd like to see if this becomes a problem. We'll see!
	if let Err(e) = remove_thumbnails(&[book_id.clone()], ctx.config.get_thumbnails_dir())
	{
		tracing::error!(
			?e,
			"Failed to remove existing media thumbnail before replacing!"
		);
	}

	let path_buf = place_thumbnail(&book_id, ext, &bytes, &ctx.config).await?;

	Ok(ImageResponse::from((
		content_type,
		fs::read(path_buf).await?,
	)))
}

#[utoipa::path(
	put,
	path = "/api/v1/media/:id/progress/:page",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get"),
		("page" = i32, Path, description = "The page to update the read progress to")
	),
	responses(
		(status = 200, description = "Successfully fetched media read progress"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Update the read progress of a media. If the progress doesn't exist, it will be created.
async fn update_media_progress(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<ProgressUpdateReturn>> {
	let user = req.user();
	let user_id = user.id.clone();

	let client = &ctx.db;
	// TODO: check library access? They don't gain access to the book here, so perhaps
	// it is acceptable to not check library access here?

	let active_session = client
		.active_reading_session()
		.upsert(
			active_reading_session::user_id_media_id(user_id.clone(), id.clone()),
			(
				media::id::equals(id.clone()),
				user::id::equals(user_id.clone()),
				vec![active_reading_session::page::set(Some(page))],
			),
			vec![active_reading_session::page::set(Some(page))],
		)
		.include(reading_session_with_book_pages::include())
		.exec()
		.await?;
	let is_completed = active_session.media.pages == page;

	if is_completed {
		let timeout = Duration::seconds(10).num_milliseconds() as u64;
		let finished_session = client
			._transaction()
			.with_max_wait(timeout)
			.with_timeout(timeout)
			.run(|tx| async move {
				let deleted_session = tx
					.active_reading_session()
					.delete(active_reading_session::user_id_media_id(
						user_id.clone(),
						id.clone(),
					))
					.exec()
					.await
					.ok();
				tracing::trace!(?deleted_session, "Deleted active reading session");

				tx.finished_reading_session()
					.create(
						deleted_session.map(|s| s.started_at).unwrap_or_default(),
						media::id::equals(id.clone()),
						user::id::equals(user_id.clone()),
						vec![],
					)
					.exec()
					.await
			})
			.await?;
		tracing::trace!(?finished_session, "Created finished reading session");
		Ok(Json(ProgressUpdateReturn::Finished(
			FinishedReadingSession::from(finished_session),
		)))
	} else {
		Ok(Json(ProgressUpdateReturn::Active(
			ActiveReadingSession::from(active_session),
		)))
	}
}

#[utoipa::path(
	get,
	path = "/api/v1/media/:id/progress",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media read progress"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_media_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Option<ActiveReadingSession>>> {
	let db = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let media_where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let result = db
		.active_reading_session()
		.find_first(vec![
			active_reading_session::user_id::equals(user_id.clone()),
			active_reading_session::media_id::equals(id.clone()),
			active_reading_session::media::is(media_where_params),
		])
		.exec()
		.await?;

	Ok(Json(result.map(ActiveReadingSession::from)))
}

// TODO: new API for managing finished sessions

#[utoipa::path(
	delete,
	path = "/api/v1/media/:id/progress",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media delete the progress for")
	),
	responses(
		(status = 200, description = "Successfully updated media read progress completion status"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn delete_media_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<MediaIsComplete>> {
	let client = &ctx.db;
	let user_id = req.id();

	let deleted_session = client
		.active_reading_session()
		.delete(active_reading_session::user_id_media_id(user_id, id))
		.exec()
		.await?;

	tracing::trace!(?deleted_session, "Deleted reading session");

	Ok(Json(MediaIsComplete::default()))
}

#[derive(Default, Deserialize, Serialize, ToSchema, specta::Type)]
pub struct MediaIsComplete {
	is_completed: bool,
	last_completed_at: Option<String>,
}

#[utoipa::path(
	get,
	path = "/api/v1/media/:id/progress/complete",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media read progress completion status"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_is_media_completed(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<MediaIsComplete>> {
	let client = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let media_where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let result = client
		.finished_reading_session()
		.find_first(vec![
			finished_reading_session::user_id::equals(user_id.clone()),
			finished_reading_session::media_id::equals(id.clone()),
			finished_reading_session::media::is(media_where_params),
		])
		.order_by(finished_reading_session::completed_at::order(
			Direction::Desc,
		))
		.include(finished_reading_session_with_book_pages::include())
		.exec()
		.await?
		.map(|ars| MediaIsComplete {
			is_completed: true,
			last_completed_at: Some(ars.completed_at.to_rfc3339()),
		})
		.unwrap_or_default();

	Ok(Json(result))
}

#[derive(Deserialize, ToSchema, specta::Type)]
pub struct PutMediaCompletionStatus {
	is_complete: bool,
	#[specta(optional)]
	page: Option<i32>,
}

#[utoipa::path(
	put,
	path = "/api/v1/media/:id/progress/complete",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to mark as completed")
	),
	responses(
		(status = 200, description = "Successfully updated media read progress completion status"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn put_media_complete_status(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	Json(payload): Json<PutMediaCompletionStatus>,
) -> APIResult<Json<MediaIsComplete>> {
	let client = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let media_where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let book = client
		.media()
		.find_first(media_where_params.clone())
		.with(media::metadata::fetch())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	let extension = book.extension.to_lowercase();

	let is_completed = payload.is_complete;

	if is_completed {
		let finished_session = client
			._transaction()
			.run(|tx| async move {
				let deleted_session = tx
					.active_reading_session()
					.delete(active_reading_session::user_id_media_id(
						user_id.clone(),
						id.clone(),
					))
					.exec()
					.await
					.ok();
				tracing::trace!(?deleted_session, "Deleted active reading session");

				tx.finished_reading_session()
					.create(
						deleted_session.map(|s| s.started_at).unwrap_or_default(),
						media::id::equals(id.clone()),
						user::id::equals(user_id.clone()),
						vec![],
					)
					.exec()
					.await
			})
			.await?;
		tracing::trace!(?finished_session, "Created finished reading session");

		Ok(Json(MediaIsComplete {
			is_completed: true,
			last_completed_at: Some(finished_session.completed_at.to_rfc3339()),
		}))
	} else {
		let page = match extension.as_str() {
			"epub" => -1,
			_ => payload.page.unwrap_or(book.pages),
		};
		let updated_or_created_session = client
			.active_reading_session()
			.upsert(
				active_reading_session::user_id_media_id(user_id.clone(), id.clone()),
				(
					media::id::equals(id.clone()),
					user::id::equals(user_id.clone()),
					vec![active_reading_session::page::set(Some(page))],
				),
				vec![active_reading_session::page::set(Some(page))],
			)
			.exec()
			.await?;
		tracing::trace!(
			?updated_or_created_session,
			"Updated or created active reading session"
		);

		Ok(Json(MediaIsComplete::default()))
	}
}

#[utoipa::path(
	post,
	path = "/api/v1/media/:id/analyze",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to analyze")
	),
	responses(
		(status = 200, description = "Successfully started media analysis"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn start_media_analysis(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<()> {
	req.enforce_permissions(&[UserPermission::ManageLibrary])?;

	// Start analysis job
	ctx.enqueue_job(AnalyzeMediaJob::analyze_media_item(id))
		.map_err(|e| {
			let err = "Failed to enqueue analyze media job";
			error!(?e, err);
			APIError::InternalServerError(err.to_string())
		})?;

	APIResult::Ok(())
}

#[utoipa::path(
	post,
	path = "/api/v1/media/:id/dimensions",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get dimensions for")
	),
	responses(
		(status = 200, description = "Successfully fetched media dimensions"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media dimensions not available"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_media_dimensions(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<Vec<PageDimension>>> {
	// Fetch the media item in question from the database while enforcing permissions
	let dimensions_entity =
		fetch_media_page_dimensions_with_permissions(&ctx, req.user(), id).await?;

	Ok(Json(dimensions_entity.dimensions))
}

#[utoipa::path(
	get,
	path = "/api/v1/media/:id/page/:page/dimensions",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get dimensions for"),
		("page" = i32, Path, description = "The page to get dimensions for (indexed from 1)")
	),
	responses(
		(status = 200, description = "Successfully fetched media page dimensions"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media dimensions not available"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_media_page_dimensions(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
) -> APIResult<Json<PageDimension>> {
	// Fetch the media item in question from the database while enforcing permissions
	let dimensions_entity =
		fetch_media_page_dimensions_with_permissions(&ctx, req.user(), id).await?;

	if page <= 0 {
		return Err(APIError::BadRequest(format!(
			"Cannot fetch page dimensions for page {}, expected a number > 0",
			page
		)));
	}

	// Get the specific page or 404
	let page_dimension = dimensions_entity
		.dimensions
		.get((page - 1) as usize)
		.ok_or(APIError::NotFound(format!(
			"No page dimensions for page: {}",
			page
		)))?;

	Ok(Json(page_dimension.to_owned()))
}

async fn fetch_media_page_dimensions_with_permissions(
	ctx: &Arc<Ctx>,
	user: &User,
	id: String,
) -> APIResult<PageDimensionsEntity> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	// Build where parameters to fetch the appropriate media
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	// Get the media from the database
	let media: Media = ctx
		.db
		.media()
		.find_first(where_params)
		.with(media::metadata::fetch().with(media_metadata::page_dimensions::fetch()))
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?
		.into();

	// Then pull off the page dimensions if available
	let dimensions_entity = media
		.metadata
		.ok_or(APIError::NotFound(
			"Media did not have metadata".to_string(),
		))?
		.page_dimensions
		.ok_or(APIError::NotFound(
			"Media metadata does not have generated page dimensions. Run analysis to generate them.".to_string(),
		))?;

	Ok(dimensions_entity)
}
