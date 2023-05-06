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
use stump_core::{
	config::get_config_dir,
	db::{
		models::{Media, ReadProgress},
		Dao, MediaDao, MediaDaoImpl,
	},
	fs::{image, media_file},
	prelude::{ContentType, PageQuery, Pageable, Pagination, PaginationQuery},
	prisma::{
		media::{self, OrderByParam as MediaOrderByParam, WhereParam},
		read_progress, user,
	},
};
use tracing::{debug, trace};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		decode_path_filter, get_session_user,
		http::{ImageResponse, NamedFile},
		FilterableQuery, MediaFilter,
	},
};

use super::series::apply_series_filters;

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
				.route("/thumbnail", get(get_media_thumbnail))
				.route("/page/:page", get(get_media_page))
				.route("/progress/:page", put(update_media_progress)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

pub(crate) fn apply_media_filters(filters: MediaFilter) -> Vec<WhereParam> {
	let mut _where: Vec<WhereParam> = vec![];

	if !filters.id.is_empty() {
		_where.push(media::id::in_vec(filters.id));
	}
	if !filters.name.is_empty() {
		_where.push(media::name::in_vec(filters.name));
	}
	if !filters.extension.is_empty() {
		_where.push(media::extension::in_vec(filters.extension));
	}
	if !filters.path.is_empty() {
		let decoded_paths = decode_path_filter(filters.path);
		_where.push(media::path::in_vec(decoded_paths));
	}

	if let Some(series_filters) = filters.series {
		_where.push(media::series::is(apply_series_filters(series_filters)));
	}

	_where
}

pub(crate) fn apply_pagination<'a>(
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
	filter_query: Query<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	trace!(?filters, ?ordering, ?pagination, "get_media");

	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters(filters);

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
				]))
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
	let media_dao = MediaDaoImpl::new(ctx.db.clone());

	if pagination.page.is_none() {
		return Ok(Json(Pageable::from(media_dao.get_duplicate_media().await?)));
	}

	Ok(Json(
		media_dao
			.get_duplicate_media_page(pagination.0.page_params())
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
	let user_id = get_session_user(&session)?.id;
	let pagination = pagination_query.0.get();

	let pagination_cloned = pagination.clone();
	let is_unpaged = pagination.is_unpaged();

	let read_progress_filter = and![
		read_progress::user_id::equals(user_id.clone()),
		read_progress::is_completed::equals(false)
	];

	let (media, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(vec![media::read_progresses::some(vec![
					read_progress_filter.clone(),
				])])
				.with(media::read_progresses::fetch(vec![
					read_progress_filter.clone()
				]))
				// TODO: check back in -> https://github.com/prisma/prisma/issues/18188
				// FIXME: not the proper ordering, BUT I cannot order based on a relation...
				// I think this just means whenever progress updates I should update the media
				// updated_at field, but that's a bit annoying TBH...
				.order_by(media::updated_at::order(Direction::Desc));

			if !is_unpaged {
				query = apply_pagination(query, &pagination_cloned);
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
				.count(vec![media::read_progresses::some(vec![
					read_progress_filter,
				])])
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
	filter_query: Query<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	session: ReadableSession,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let FilterableQuery { filters, .. } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	trace!(?filters, ?pagination, "get_recently_added_media");

	let is_unpaged = pagination.is_unpaged();

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters(filters);

	let (media, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(where_conditions.clone())
				.with(media::read_progresses::fetch(vec![
					read_progress::user_id::equals(user_id),
				]))
				.order_by(media::created_at::order(Direction::Desc));

			if !is_unpaged {
				query = apply_pagination(query, &pagination_cloned);
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
	let user_id = get_session_user(&session)?.id;

	let mut query = db.media().find_unique(media::id::equals(id.clone())).with(
		media::read_progresses::fetch(vec![read_progress::user_id::equals(user_id)]),
	);

	if params.load_series.unwrap_or_default() {
		trace!(media_id = id, "Loading series relation for media");
		query = query.with(media::series::fetch());
	}

	let result = query.exec().await?;
	debug!(media_id = id, ?result, "Get media by id");

	if result.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	Ok(Json(Media::from(result.unwrap())))
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
) -> ApiResult<NamedFile> {
	let db = ctx.get_db();

	let media = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if media.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let media = media.unwrap();

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
) -> Result<(), ApiError> {
	let db = ctx.get_db();

	let media = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if media.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let media = media.unwrap();

	if media.extension != "cbr" || media.extension != "rar" {
		return Err(ApiError::BadRequest(format!(
			"Media with id {} is not a rar file. Stump only supports converting rar/cbr files to zip/cbz.",
			id
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
	let user_id = get_session_user(&session)?.id;

	let book = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
		]))
		.exec()
		.await?;

	match book {
		Some(book) => {
			if page > book.pages {
				// FIXME: probably won't work lol
				Err(ApiError::Redirect(format!(
					"/book/{}/read?page={}",
					id, book.pages
				)))
			} else {
				Ok(media_file::get_page(&book.path, page)?.into())
			}
		},
		None => Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		))),
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
async fn get_media_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let webp_path = get_config_dir()
		.join("thumbnails")
		.join(format!("{}.webp", id));

	if webp_path.exists() {
		trace!("Found webp thumbnail for media {}", id);
		return Ok((ContentType::WEBP, image::get_bytes(webp_path)?).into());
	}

	let result = db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if let Some(book) = result {
		Ok(media_file::get_page(book.path.as_str(), 1)?.into())
	} else {
		Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)))
	}
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
