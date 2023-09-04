use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, put},
	Json, Router,
};
use axum_extra::extract::Query;
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::{and, or, Direction};
use serde::Deserialize;
use serde_qs::axum::QsQuery;
use stump_core::{
	config::get_config_dir,
	db::{
		entity::{LibraryOptions, Media, ReadProgress},
		query::pagination::{PageQuery, Pageable, Pagination, PaginationQuery},
		MediaDAO, DAO,
	},
	filesystem::{media::get_page, read_entire_file, ContentType},
	prisma::{
		library_options,
		media::{self, OrderByParam as MediaOrderByParam, WhereParam},
		media_metadata, read_progress, series, series_metadata, user, PrismaClient,
	},
};
use tracing::trace;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	routers::api::v1::series::apply_series_age_restriction,
	utils::{
		chain_optional_iter, decode_path_filter, get_session_user,
		http::{ImageResponse, NamedFile},
		FilterableQuery, MediaBaseFilter, MediaFilter, MediaRelationFilter,
	},
};

use super::{metadata::apply_media_metadata_base_filters, series::apply_series_filters};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/media", get(get_media))
		.route("/media/duplicates", get(get_duplicate_media))
		.route("/media/keep-reading", get(get_in_progress_media))
		.route("/media/recently-added", get(get_recently_added_media))
		.nest(
			"/media/:id",
			Router::new()
				.route("/", get(get_media_by_id))
				.route("/file", get(get_media_file))
				.route("/convert", get(convert_media))
				.route("/thumbnail", get(get_media_thumbnail_handler))
				.route("/page/:page", get(get_media_page))
				.route("/progress/:page", put(update_media_progress)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
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
) -> read_progress::WhereParam {
	and![
		read_progress::user_id::equals(user_id),
		or![
			read_progress::page::gt(0),
			read_progress::epubcfi::not(None),
			read_progress::is_completed::equals(false)
		]
	]
}

/// Generates a condition to enforce age restrictions on media and their corresponding
/// series.
pub(crate) fn apply_media_age_restriction(min_age: i32, allow_unset: bool) -> WhereParam {
	and![
		media::metadata::is(if allow_unset {
			vec![or![
				media_metadata::age_rating::equals(None),
				media_metadata::age_rating::lte(min_age)
			]]
		} else {
			vec![
				media_metadata::age_rating::not(None),
				media_metadata::age_rating::lte(min_age),
			]
		}),
		media::series::is(vec![apply_series_age_restriction(min_age, allow_unset)])
	]
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
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all media accessible to the requester. This is a paginated request, and
/// has various pagination params available.
#[tracing::instrument(skip(ctx, session))]
async fn get_media(
	filter_query: QsQuery<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	trace!(?filters, ?ordering, ?pagination, "get_media");

	let db = ctx.get_db();
	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters(filters)
		.into_iter()
		.chain(
			age_restrictions
				.map(|ar| vec![ar])
				.unwrap_or_else(|| vec![]),
		)
		.collect::<Vec<WhereParam>>();

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
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

#[utoipa::path(
	get,
	path = "/api/v1/media/duplicates",
	tag = "media",
	params(
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination options"),
	),
	responses(
		(status = 200, description = "Successfully fetched duplicate media", body = PageableMedia),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
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
	_session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let media_dao = MediaDAO::new(ctx.db.clone());

	if pagination.page.is_none() {
		return Err(ApiError::BadRequest(
			"Pagination is required for this request".to_string(),
		));
	}

	Ok(Json(
		media_dao
			.get_duplicate_media(pagination.0.page_params())
			.await?,
	))
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
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all media which the requester has progress for that is less than the
/// total number of pages available (i.e not completed).
async fn get_in_progress_media(
	State(ctx): State<AppState>,
	session: ReadableSession,
	pagination_query: Query<PaginationQuery>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let pagination = pagination_query.0.get();

	let pagination_cloned = pagination.clone();
	let is_unpaged = pagination.is_unpaged();

	let read_progress_filter = and![
		read_progress::user_id::equals(user_id.clone()),
		read_progress::is_completed::equals(false)
	];

	let where_conditions = vec![media::read_progresses::some(vec![
		read_progress_filter.clone()
	])]
	.into_iter()
	.chain(
		age_restrictions
			.map(|ar| vec![ar])
			.unwrap_or_else(|| vec![]),
	)
	.collect::<Vec<WhereParam>>();

	let (media, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::read_progresses::fetch(vec![read_progress_filter]))
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
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all media which was added to the library in descending order of when it
/// was added.
async fn get_recently_added_media(
	filter_query: QsQuery<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	session: ReadableSession,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let FilterableQuery { filters, .. } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	trace!(?filters, ?pagination, "get_recently_added_media");

	let db = ctx.get_db();
	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let is_unpaged = pagination.is_unpaged();

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters(filters)
		.into_iter()
		.chain(
			age_restrictions
				.map(|ar| vec![ar])
				.unwrap_or_else(|| vec![]),
		)
		.collect::<Vec<WhereParam>>();

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
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

#[derive(Deserialize)]
struct LoadSeries {
	load_series: Option<bool>,
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
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Media not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get a media by its ID. If provided, the `load_series` query param will load
/// the series relation for the media.
async fn get_media_by_id(
	Path(id): Path<String>,
	params: Query<LoadSeries>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Media>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let mut query = db
		.media()
		.find_first(chain_optional_iter(
			[media::id::equals(id.clone())],
			[age_restrictions],
		))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
		]))
		.with(media::metadata::fetch());

	if params.load_series.unwrap_or_default() {
		trace!(media_id = id, "Loading series relation for media");
		query = query.with(media::series::fetch());
	}

	let media = query
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Media not found")))?;

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
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Media not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Download the file associated with the media.
async fn get_media_file(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<NamedFile> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let media = db
		.media()
		.find_first(chain_optional_iter(
			[media::id::equals(id.clone())],
			[age_restrictions],
		))
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Media not found")))?;

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
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Media not found."),
		(status = 500, description = "Internal server error."),
	)
)]
// TODO: remove this, implement it? maybe?
/// Converts a media file to a different format. Currently UNIMPLEMENTED.
async fn convert_media(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> Result<(), ApiError> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let media = db
		.media()
		.find_first(chain_optional_iter(
			[media::id::equals(id.clone())],
			[age_restrictions],
		))
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Media not found")))?;

	if media.extension != "cbr" || media.extension != "rar" {
		return Err(ApiError::BadRequest(String::from(
			"Stump only supports RAR to ZIP conversions at this time",
		)));
	}

	Err(ApiError::NotImplemented)
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
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Media not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get a page of a media
async fn get_media_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let user_id = user.id;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	let media = db
		.media()
		.find_first(chain_optional_iter(
			[media::id::equals(id.clone())],
			[age_restrictions],
		))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
		]))
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Media not found")))?;

	if page > media.pages {
		Err(ApiError::BadRequest(format!(
			"Page {} is out of bounds for media {}",
			page, id
		)))
	} else {
		Ok(get_page(&media.path, page)?.into())
	}
}

pub(crate) async fn get_media_thumbnail(
	id: String,
	db: &PrismaClient,
	session: &ReadableSession,
) -> ApiResult<(ContentType, Vec<u8>)> {
	let thumbnail_dir = get_config_dir().join("thumbnails");

	let user = get_session_user(&session)?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_conditions =
		chain_optional_iter([media::id::equals(id.clone())], [age_restrictions]);

	let result = db
		._transaction()
		.run(|client| async move {
			let book = client
				.media()
				.find_first(where_conditions)
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
					.map(|options| (Some(book), options))
			} else {
				Ok((None, None))
			}
		})
		.await?;
	trace!(?result, "get_media_thumbnail transaction completed");

	match result {
		(Some(book), Some(options)) => {
			let library_options = LibraryOptions::from(options);
			if let Some(config) = library_options.thumbnail_config {
				let thumbnail_path = thumbnail_dir.join(format!(
					"{}.{}",
					book.id,
					config.format.extension()
				));
				if thumbnail_path.exists() {
					trace!(path = ?thumbnail_path, media_id = ?id, "Found generated media thumbnail");
					return Ok((
						ContentType::from(config.format),
						read_entire_file(thumbnail_path)?,
					));
				}
			}

			Ok(get_page(book.path.as_str(), 1)?)
		},
		(Some(book), None) => Ok(get_page(book.path.as_str(), 1)?),
		_ => Err(ApiError::NotFound(String::from("Media not found"))),
	}
}

// TODO: ImageResponse as body type
#[utoipa::path(
	get,
	path = "/api/v1/media/:id/thumbnail",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media thumbnail"),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Media not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get the thumbnail image of a media
async fn get_media_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<ImageResponse> {
	trace!(?id, "get_media_thumbnail");
	let db = ctx.get_db();
	get_media_thumbnail(id, db, &session)
		.await
		.map(ImageResponse::from)
}

#[utoipa::path(
	put,
	path = "/api/v1/media/:id/read-progress",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get"),
		("page" = i32, Path, description = "The page to update the read progress to")
	),
	responses(
		(status = 200, description = "Successfully fetched media read progress"),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Media not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Update the read progress of a media. If the progress doesn't exist, it will be created.
async fn update_media_progress(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<ReadProgress>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let read_progress = db
		._transaction()
		.run(|client| async move {
			let read_progress = client
				.read_progress()
				.upsert(
					read_progress::user_id_media_id(user_id.clone(), id.clone()),
					(
						page,
						media::id::equals(id.clone()),
						user::id::equals(user_id.clone()),
						vec![],
					),
					vec![read_progress::page::set(page)],
				)
				.with(read_progress::media::fetch())
				.exec()
				.await?;

			// NOTE: EPUB feature tracking!
			// This pattern only works for page-based media... So will have to be
			// considered/revisited once that feature gets prioritized
			let is_completed = read_progress
				.media
				.as_ref()
				.map(|media| media.pages == page)
				.unwrap_or_default();

			if is_completed {
				client
					.read_progress()
					.update(
						read_progress::id::equals(read_progress.id.clone()),
						vec![read_progress::is_completed::set(true)],
					)
					.exec()
					.await
			} else {
				Ok(read_progress)
			}
		})
		.await?;

	Ok(Json(ReadProgress::from(read_progress)))
}
