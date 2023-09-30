use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, put},
	Json, Router,
};
use axum_extra::extract::Query;
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::{and, operator::or, or, Direction};
use serde::Deserialize;
use serde_qs::axum::QsQuery;
use stump_core::{
	config::get_config_dir,
	db::{
		entity::{LibraryOptions, Media, ReadProgress, User},
		query::pagination::{PageQuery, Pageable, Pagination, PaginationQuery},
		MediaDAO, DAO,
	},
	filesystem::{
		get_unknown_thumnail,
		image::{generate_thumbnail, ImageFormat, ImageProcessorOptions},
		media::get_page,
		read_entire_file, ContentType, FileParts, PathUtils,
	},
	prisma::{
		library, library_options,
		media::{self, OrderByParam as MediaOrderByParam, WhereParam},
		media_metadata, read_progress, series, series_metadata, tag, user, PrismaClient,
	},
};
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		chain_optional_iter, decode_path_filter, get_session_admin_user,
		get_session_user,
		http::{ImageResponse, NamedFile},
		FilterableQuery, MediaBaseFilter, MediaFilter, MediaRelationFilter, ReadStatus,
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
				.route(
					"/thumbnail",
					get(get_media_thumbnail_handler).patch(patch_media_thumbnail),
				)
				.route("/page/:page", get(get_media_page))
				.route("/progress/:page", put(update_media_progress)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
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
					ReadStatus::Reading => media::read_progresses::some(vec![and![
						read_progress::user_id::equals(user_id.clone()),
						read_progress::is_completed::equals(false)
					]]),
					ReadStatus::Completed => media::read_progresses::some(vec![and![
						read_progress::user_id::equals(user_id.clone()),
						read_progress::is_completed::equals(true)
					]]),
					ReadStatus::Unread => media::read_progresses::none(vec![
						read_progress::user_id::equals(user_id.clone()),
					]),
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
	apply_media_filters(filters)
		.into_iter()
		.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
		.chain(apply_media_read_status_filter(user_id, read_status_filters))
		.collect::<Vec<WhereParam>>()
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
			and![
				// If the media has no age rating, and restrict on unset is disabled, it can be allowed
				// so long as the series has no age rating OR it is under
				media::metadata::is(vec![media_metadata::age_rating::equals(None)]),
				media::series::is(vec![or![
					series::metadata::is(vec![
						series_metadata::age_rating::not(None),
						series_metadata::age_rating::lte(min_age),
					]),
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

	tracing::trace!(?filters, ?ordering, ?pagination, "get_media");

	let db = ctx.get_db();
	let user = get_session_user(&session)?;
	let user_id = user.id.clone();

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters_for_user(filters, &user);

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
	.chain(age_restrictions.map(|ar| vec![ar]).unwrap_or_default())
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

	tracing::trace!(?filters, ?pagination, "get_recently_added_media");

	let db = ctx.get_db();
	let user = get_session_user(&session)?;
	let user_id = user.id.clone();

	let is_unpaged = pagination.is_unpaged();

	let pagination_cloned = pagination.clone();
	let where_conditions = apply_media_filters_for_user(filters, &user);

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
		tracing::trace!(media_id = id, "Loading series relation for media");
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

pub(crate) async fn get_media_thumbnail_by_id(
	id: String,
	db: &PrismaClient,
	session: &ReadableSession,
) -> ApiResult<(ContentType, Vec<u8>)> {
	let user = get_session_user(session)?;
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
					.map(|options| (Some(book), options.map(LibraryOptions::from)))
			} else {
				Ok((None, None))
			}
		})
		.await?;
	tracing::trace!(?result, "get_media_thumbnail transaction completed");

	match result {
		(Some(book), Some(options)) => get_media_thumbnail(
			&book,
			options.thumbnail_config.map(|config| config.format),
		),
		(Some(book), None) => get_media_thumbnail(&book, None),
		_ => Err(ApiError::NotFound(String::from("Media not found"))),
	}
}

pub(crate) fn get_media_thumbnail(
	media: &media::Data,
	target_format: Option<ImageFormat>,
) -> ApiResult<(ContentType, Vec<u8>)> {
	let thumbnail_dir = get_config_dir().join("thumbnails");
	if let Some(format) = target_format {
		let extension = format.extension();
		let thumbnail_path = thumbnail_dir.join(format!("{}.{}", media.id, extension));
		if thumbnail_path.exists() {
			tracing::trace!(path = ?thumbnail_path, media_id = ?media.id, "Found generated media thumbnail");
			return Ok((ContentType::from(format), read_entire_file(thumbnail_path)?));
		}
	} else if let Some(path) = get_unknown_thumnail(&media.id) {
		// If there exists a file that starts with the media id in the thumbnails dir,
		// then return it. This might happen if a user manually regenerates thumbnails
		// via the API without updating the thumbnail config...
		tracing::debug!(path = ?path, media_id = ?media.id, "Found media thumbnail that does not align with config");
		let FileParts { extension, .. } = path.file_parts();
		return Ok((
			ContentType::from_extension(extension.as_str()),
			read_entire_file(path)?,
		));
	}

	Ok(get_page(media.path.as_str(), 1)?)
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
	tracing::trace!(?id, "get_media_thumbnail");
	let db = ctx.get_db();
	get_media_thumbnail_by_id(id, db, &session)
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
        ("id" = String, Path, description = "The ID of the media to get")
    ),
    responses(
        (status = 200, description = "Successfully updated media thumbnail"),
        (status = 401, description = "Unauthorized."),
        (status = 403, description = "Forbidden."),
        (status = 404, description = "Media not found."),
        (status = 500, description = "Internal server error."),
    )
)]
async fn patch_media_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
	Json(body): Json<PatchMediaThumbnail>,
) -> ApiResult<ImageResponse> {
	get_session_admin_user(&session)?;

	let client = ctx.get_db();

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
		.find_unique(media::id::equals(id.clone()))
		.with(
			media::series::fetch()
				.with(series::library::fetch().with(library::library_options::fetch())),
		)
		.exec()
		.await?
		.ok_or(ApiError::NotFound(String::from("Media not found")))?;

	if media.extension == "epub" {
		return Err(ApiError::NotSupported);
	}

	let library = media
		.series()?
		.ok_or(ApiError::NotFound(String::from("Series relation missing")))?
		.library()?
		.ok_or(ApiError::NotFound(String::from("Library relation missing")))?;
	let thumbnail_options = library
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

	let format = thumbnail_options.format.clone();
	let path_buf = generate_thumbnail(&id, &media.path, thumbnail_options)?;
	Ok(ImageResponse::from((
		ContentType::from(format),
		read_entire_file(path_buf)?,
	)))
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
