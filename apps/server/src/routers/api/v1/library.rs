use axum::{
	extract::{DefaultBodyLimit, Multipart, Path, Query, State},
	middleware::from_extractor_with_state,
	routing::{get, post, put},
	Json, Router,
};
use prisma_client_rust::{chrono::Utc, not, or, raw, Direction, PrismaValue};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use specta::Type;
use std::path;
use tower_sessions::Session;
use tracing::{debug, error, trace};
use utoipa::ToSchema;

use stump_core::{
	config::StumpConfig,
	db::{
		entity::{
			library_series_ids_media_ids_include, library_thumbnails_deletion_include,
			FileStatus, Library, LibraryOptions, LibraryScanMode, LibraryStats, Media,
			Series, Tag, User, UserPermission,
		},
		query::pagination::{Pageable, Pagination, PaginationQuery},
		PrismaCountTrait,
	},
	filesystem::{
		analyze_media_job::AnalyzeMediaJob,
		get_unknown_thumnail,
		image::{
			self, generate_thumbnail, place_thumbnail, remove_thumbnails,
			remove_thumbnails_of_type, ImageFormat, ImageProcessorOptions,
			ThumbnailGenerationJob, ThumbnailGenerationJobParams,
		},
		read_entire_file,
		scanner::LibraryScanJob,
		ContentType, FileParts, PathUtils,
	},
	prisma::{
		last_library_visit,
		library::{self, WhereParam},
		library_options,
		media::{self, OrderByParam as MediaOrderByParam},
		series::{self, OrderByParam as SeriesOrderByParam},
		tag, user,
	},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{
		chain_optional_iter, decode_path_filter, FilterableQuery, LibraryBaseFilter,
		LibraryFilter, LibraryRelationFilter, MediaFilter, SeriesFilter,
	},
	middleware::auth::Auth,
	utils::{
		enforce_session_permissions, get_session_server_owner_user, get_session_user,
		get_user_and_enforce_permission, http::ImageResponse, validate_image_upload,
	},
};

use super::{
	media::{apply_media_age_restriction, apply_media_filters, apply_media_pagination},
	series::{
		apply_series_age_restriction, apply_series_base_filters, apply_series_filters,
		get_series_thumbnail,
	},
};

// TODO: age restrictions!
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/libraries", get(get_libraries).post(create_library))
		.route("/libraries/stats", get(get_libraries_stats))
		.nest(
			"/libraries/last-visited",
			Router::new()
				.route("/", get(get_last_visited_library))
				.route("/:id", put(update_last_visited_library)),
		)
		.nest(
			"/libraries/:id",
			Router::new()
				.route(
					"/",
					get(get_library_by_id)
						.put(update_library)
						.delete(delete_library),
				)
				.route("/stats", get(get_library_stats))
				.route(
					"/excluded-users",
					get(get_library_excluded_users).post(update_library_excluded_users),
				)
				.route("/scan", get(scan_library))
				.route("/clean", put(clean_library))
				.route("/series", get(get_library_series))
				.route("/media", get(get_library_media))
				.route("/analyze", post(start_media_analysis))
				.nest(
					"/thumbnail",
					Router::new()
						.route(
							"/",
							get(get_library_thumbnail_handler)
								.patch(patch_library_thumbnail)
								.post(replace_library_thumbnail)
								// TODO: configurable max file size
								.layer(DefaultBodyLimit::max(20 * 1024 * 1024)) // 20MB
								.delete(delete_library_thumbnails),
						)
						.route("/generate", post(generate_library_thumbnails)),
				),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

pub(crate) fn apply_library_base_filters(filters: LibraryBaseFilter) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			(!filters.id.is_empty()).then(|| library::id::in_vec(filters.id)),
			(!filters.name.is_empty()).then(|| library::name::in_vec(filters.name)),
			(!filters.path.is_empty()).then(|| {
				let decoded_paths = decode_path_filter(filters.path);
				library::path::in_vec(decoded_paths)
			}),
			filters.search.map(library::name::contains),
		],
	)
}

pub(crate) fn apply_library_relation_filters(
	filters: LibraryRelationFilter,
) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[filters
			.series
			.map(apply_series_base_filters)
			.map(library::series::some)],
	)
}

pub(crate) fn library_not_hidden_from_user_filter(user: &User) -> WhereParam {
	library::hidden_from_users::none(vec![user::id::equals(user.id.clone())])
}

// FIXME: hidden libraries introduced a bug here, need to fix!

pub(crate) fn apply_library_filters_for_user(
	filters: LibraryFilter,
	user: &User,
) -> Vec<WhereParam> {
	let not_hidden_filter = library_not_hidden_from_user_filter(user);
	apply_library_base_filters(filters.base_filter)
		.into_iter()
		.chain(apply_library_relation_filters(filters.relation_filter))
		.chain([not_hidden_filter])
		.collect()
}

#[utoipa::path(
	get,
	path = "/api/v1/libraries",
	tag = "library",
	params(
		("filter_query" = Option<FilterableLibraryQuery>, Query, description = "The library filters"),
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination options")
	),
	responses(
		(status = 200, description = "Successfully retrieved libraries", body = PageableLibraries),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
/// Get all libraries
#[tracing::instrument(skip(ctx), err)]
async fn get_libraries(
	filter_query: QsQuery<FilterableQuery<LibraryFilter>>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Pageable<Vec<Library>>>> {
	let user = get_session_user(&session)?;
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	tracing::trace!(?filters, ?ordering, ?pagination, "get_libraries");

	let is_unpaged = pagination.is_unpaged();
	let where_conditions = apply_library_filters_for_user(filters, &user);
	let order_by = ordering.try_into()?;

	let mut query = ctx
		.db
		.library()
		.find_many(where_conditions.clone())
		.with(library::tags::fetch(vec![]))
		.with(library::library_options::fetch())
		.order_by(order_by);

	if !is_unpaged {
		match pagination.clone() {
			Pagination::Page(page_query) => {
				let (skip, take) = page_query.get_skip_take();
				query = query.skip(skip).take(take);
			},
			Pagination::Cursor(cursor_query) => {
				if let Some(cursor) = cursor_query.cursor {
					query = query.cursor(library::id::equals(cursor)).skip(1)
				}
				if let Some(limit) = cursor_query.limit {
					query = query.take(limit)
				}
			},
			_ => unreachable!(),
		}
	}

	let libraries = query
		.exec()
		.await?
		.into_iter()
		.map(|l| l.into())
		.collect::<Vec<Library>>();

	if is_unpaged {
		return Ok(Json(libraries.into()));
	}

	let count = ctx.db.library().count(where_conditions).exec().await?;

	Ok(Json((libraries, count, pagination).into()))
}

async fn get_last_visited_library(
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Option<Library>>> {
	let client = &ctx.db;
	let user = get_session_user(&session)?;

	let last_visited_library = client
		.last_library_visit()
		.find_first(vec![last_library_visit::user_id::equals(user.id)])
		.with(last_library_visit::library::fetch())
		.exec()
		.await?;

	let library = last_visited_library
		.map(|llv| llv.library().cloned())
		.transpose()?;

	Ok(Json(library.map(Library::from)))
}

async fn update_last_visited_library(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Library>> {
	let client = &ctx.db;
	let user = get_session_user(&session)?;

	let last_library_visit = client
		.last_library_visit()
		.upsert(
			last_library_visit::user_id_library_id(user.id.clone(), id.clone()),
			(
				user::id::equals(user.id.clone()),
				library::id::equals(id.clone()),
				vec![last_library_visit::timestamp::set(Utc::now().into())],
			),
			vec![last_library_visit::timestamp::set(Utc::now().into())],
		)
		.with(last_library_visit::library::fetch())
		.exec()
		.await?;

	// TODO: fetch first in order to enforce access
	let library = last_library_visit
		.library()
		.ok()
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	Ok(Json(Library::from(library.to_owned())))
}

#[derive(Debug, Deserialize, ToSchema, Type)]
pub struct LibraryStatsParams {
	#[serde(default)]
	all_users: bool,
}

// TODO(historical-read-session): refactor query
#[utoipa::path(
	get,
	path = "/api/v1/libraries/stats",
	tag = "library",
	responses(
		(status = 200, description = "Successfully fetched stats", body = LibraryStats),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
/// Get stats for all libraries
async fn get_libraries_stats(
	State(ctx): State<AppState>,
	Query(params): Query<LibraryStatsParams>,
	session: Session,
) -> APIResult<Json<LibraryStats>> {
	let user = get_session_user(&session)?;
	let db = &ctx.db;

	let stats = db
		._query_raw::<LibraryStats>(raw!(
			r#"
			WITH base_counts AS (
				SELECT
					COUNT(*) AS book_count,
					IFNULL(SUM(media.size), 0) AS total_bytes,
					IFNULL(series_count, 0) AS series_count
				FROM
					media
					INNER JOIN (
						SELECT
							COUNT(*) AS series_count
						FROM
							series)
			),
			progress_counts AS (
				SELECT
					IFNULL(SUM(
							CASE WHEN rp.is_completed THEN
								1
							ELSE
								0
							END),
						0) AS completed_books,
					IFNULL(SUM(
							CASE WHEN rp.is_completed THEN
								0
							ELSE
								1
							END),
						0) AS in_progress_books
				FROM
					media m
					INNER JOIN read_progresses rp ON rp.media_id = m.id
				WHERE
					rp.is_completed AND (
						{} IS TRUE OR rp.user_id = {}
					)
			)
			SELECT
				*
			FROM
				base_counts
				INNER JOIN progress_counts;
			"#,
			PrismaValue::Boolean(params.all_users),
			PrismaValue::String(user.id)
		))
		.exec()
		.await?
		.into_iter()
		.next()
		.ok_or(APIError::InternalServerError(
			"Failed to compute stats for libraries".to_string(),
		))?;

	Ok(Json(stats))
}

#[utoipa::path(
	get,
	path = "/api/v1/libraries/:id",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID")
	),
	responses(
		(status = 200, description = "Successfully retrieved library", body = Library),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Get a library by ID
async fn get_library_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Library>> {
	let user = get_session_user(&session)?;
	let db = &ctx.db;

	let library = db
		.library()
		.find_first(
			[library::id::equals(id.clone())]
				.into_iter()
				.chain([library_not_hidden_from_user_filter(&user)])
				.collect(),
		)
		.with(library::library_options::fetch())
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	Ok(Json(library.into()))
}

#[utoipa::path(
	get,
	path = "/api/v1/libraries/:id/series",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
		("filter_query" = Option<FilterableLibraryQuery>, Query, description = "The library filters"),
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination options")
	),
	responses(
		(status = 200, description = "Successfully retrieved series", body = PageableSeries),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Returns the series in a given library. Will *not* load the media relation.
async fn get_library_series(
	filter_query: Query<FilterableQuery<SeriesFilter>>,
	pagination_query: Query<PaginationQuery>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery {
		ordering, filters, ..
	} = filter_query.0.get();
	let pagination = pagination_query.0.get();
	tracing::debug!(?filters, ?ordering, ?pagination, "get_library_series");

	let db = &ctx.db;

	let user = get_session_user(&session)?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset));

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: SeriesOrderByParam = ordering.try_into()?;

	let where_conditions = apply_series_filters(filters)
		.into_iter()
		.chain(chain_optional_iter(
			[
				series::library_id::equals(Some(id.clone())),
				series::library::is(vec![library_not_hidden_from_user_filter(&user)]),
			],
			[age_restrictions],
		))
		.collect::<Vec<series::WhereParam>>();

	let mut query = db
		.series()
		.find_many(where_conditions.clone())
		.order_by(order_by_param);

	if !is_unpaged {
		match pagination.clone() {
			Pagination::Page(page_query) => {
				let (skip, take) = page_query.get_skip_take();
				query = query.skip(skip).take(take);
			},
			Pagination::Cursor(cursor_query) => {
				if let Some(cursor) = cursor_query.cursor {
					query = query.cursor(series::id::equals(cursor)).skip(1)
				}
				if let Some(limit) = cursor_query.limit {
					query = query.take(limit)
				}
			},
			_ => unreachable!("Pagination should be either page or cursor"),
		}
	}

	let series = query.exec().await?;
	let series_ids = series.iter().map(|s| s.id.clone()).collect();
	let media_counts = db.series_media_count(series_ids).await?;

	let series = series
		.iter()
		.map(|s| {
			let media_count = if let Some(count) = media_counts.get(&s.id) {
				count.to_owned()
			} else {
				0
			};

			(s.to_owned(), media_count).into()
		})
		.collect::<Vec<Series>>();

	if is_unpaged {
		return Ok(Json(series.into()));
	}

	let series_count = db.series().count(where_conditions).exec().await?;

	Ok(Json((series, series_count, pagination).into()))
}

async fn get_library_media(
	filter_query: Query<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Pageable<Vec<Media>>>> {
	let user = get_session_user(&session)?;

	let FilterableQuery { ordering, filters } = filter_query.0.get();
	let pagination = pagination_query.0.get();
	let pagination_cloned = pagination.clone();

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let media_conditions = apply_media_filters(filters)
		.into_iter()
		.chain([media::series::is(vec![
			series::library_id::equals(Some(id.clone())),
			series::library::is(vec![library_not_hidden_from_user_filter(&user)]),
		])])
		.collect::<Vec<media::WhereParam>>();

	let (media, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(media_conditions.clone())
				.order_by(order_by_param);

			if !is_unpaged {
				query = apply_media_pagination(query, &pagination_cloned)
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
				.count(media_conditions)
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

pub(crate) fn get_library_thumbnail(
	library: &library::Data,
	first_series: &series::Data,
	first_book: &media::Data,
	image_format: Option<ImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let library_id = library.id.clone();

	if let Some(format) = image_format.clone() {
		let extension = format.extension();

		let path = config
			.get_thumbnails_dir()
			.join(format!("{}.{}", library_id, extension));

		if path.exists() {
			tracing::trace!(?path, library_id, "Found generated library thumbnail");
			return Ok((ContentType::from(format), read_entire_file(path)?));
		}
	}

	if let Some(path) = get_unknown_thumnail(&library_id, config.get_thumbnails_dir()) {
		tracing::debug!(path = ?path, library_id, "Found library thumbnail that does not align with config");
		let FileParts { extension, .. } = path.file_parts();
		return Ok((
			ContentType::from_extension(extension.as_str()),
			read_entire_file(path)?,
		));
	}

	get_series_thumbnail(first_series, first_book, image_format, config)
}

// TODO: ImageResponse for utoipa
#[utoipa::path(
	get,
	path = "/api/v1/libraries/:id/thumbnail",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
	),
	responses(
		(status = 200, description = "Successfully retrieved library thumbnail"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Get the thumbnail image for a library by id, if the current user has access to it.
async fn get_library_thumbnail_handler(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<ImageResponse> {
	let db = &ctx.db;

	let user = get_session_user(&session)?;
	let age_restriction = user.age_restriction.as_ref();

	let first_series = db
		.series()
		// Find the first series in the library which satisfies the age restriction
		.find_first(chain_optional_iter(
			[
				series::library_id::equals(Some(id.clone())),
				series::library::is(vec![library_not_hidden_from_user_filter(&user)]),
			],
			[age_restriction
				.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset))],
		))
		.with(
			// Then load the first media in that series which satisfies the age restriction
			series::media::fetch(chain_optional_iter(
				[],
				[age_restriction
					.as_ref()
					.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset))],
			))
			.take(1)
			.order_by(media::name::order(Direction::Asc)),
		)
		.with(series::library::fetch().with(library::library_options::fetch()))
		.order_by(series::name::order(Direction::Asc))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library has no series".to_string()))?;

	let library = first_series
		.library()?
		.ok_or(APIError::Unknown(String::from("Failed to load library")))?;
	let image_format = library
		.library_options()
		.map(LibraryOptions::from)?
		.thumbnail_config
		.map(|config| config.format);

	let first_book = first_series.media()?.first().ok_or(APIError::NotFound(
		"Library has no media to get thumbnail from".to_string(),
	))?;

	get_library_thumbnail(
		library,
		&first_series,
		first_book,
		image_format,
		&ctx.config,
	)
	.map(ImageResponse::from)
}

#[derive(Deserialize, ToSchema, specta::Type)]
pub struct PatchLibraryThumbnail {
	/// The ID of the media inside the series to fetch
	media_id: String,
	/// The page of the media to use for the thumbnail
	page: i32,
	#[specta(optional)]
	/// A flag indicating whether the page is zero based
	is_zero_based: Option<bool>,
}

#[utoipa::path(
    patch,
    path = "/api/v1/libraries/:id/thumbnail",
    tag = "library",
    params(
        ("id" = String, Path, description = "The ID of the library")
    ),
    responses(
        (status = 200, description = "Successfully updated library thumbnail"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 404, description = "Series not found"),
        (status = 500, description = "Internal server error"),
    )
)]
async fn patch_library_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	Json(body): Json<PatchLibraryThumbnail>,
) -> APIResult<ImageResponse> {
	let user = enforce_session_permissions(&session, &[UserPermission::ManageLibrary])?;
	get_session_server_owner_user(&session)?;

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
		.find_first(vec![
			media::series::is(vec![
				series::library_id::equals(Some(id.clone())),
				series::library::is(vec![library_not_hidden_from_user_filter(&user)]),
			]),
			media::id::equals(body.media_id),
		])
		.with(
			media::series::fetch()
				.with(series::library::fetch().with(library::library_options::fetch())),
		)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from(
			"Library not found or doesn't contain requested book",
		)))?;

	if media.extension == "epub" {
		return Err(APIError::NotSupported);
	}

	let library = media
		.series()?
		.ok_or(APIError::NotFound(String::from("Series relation missing")))?
		.library()?
		.ok_or(APIError::NotFound(String::from("Library relation missing")))?;
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
	let path_buf = generate_thumbnail(&id, &media.path, thumbnail_options, &ctx.config)?;
	Ok(ImageResponse::from((
		ContentType::from(format),
		read_entire_file(path_buf)?,
	)))
}

async fn replace_library_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	mut upload: Multipart,
) -> APIResult<ImageResponse> {
	let user = enforce_session_permissions(
		&session,
		&[UserPermission::UploadFile, UserPermission::ManageLibrary],
	)?;
	let client = &ctx.db;

	tracing::trace!(?id, ?upload, "Replacing library thumbnail");

	let library = client
		.library()
		.find_first(vec![
			library::id::equals(id),
			library_not_hidden_from_user_filter(&user),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))?;

	let (content_type, bytes) = validate_image_upload(&mut upload).await?;

	let ext = content_type.extension();
	let library_id = library.id;

	// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
	// user testing I'd like to see if this becomes a problem. We'll see!
	match remove_thumbnails(&[library_id.clone()], ctx.config.get_thumbnails_dir()) {
		Ok(count) => tracing::info!("Removed {} thumbnails!", count),
		Err(e) => tracing::error!(
			?e,
			"Failed to remove existing library thumbnail before replacing!"
		),
	}

	let path_buf = place_thumbnail(&library_id, ext, &bytes, &ctx.config)?;

	Ok(ImageResponse::from((
		content_type,
		read_entire_file(path_buf)?,
	)))
}

/// Deletes all media thumbnails in a library by id, if the current user has access to it.
#[utoipa::path(
	delete,
	path = "/api/v1/libraries/:id/thumbnail",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
	),
	responses(
		(status = 200, description = "Successfully deleted library thumbnails"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
// TODO: make this a queuable job
async fn delete_library_thumbnails(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<()>> {
	let user = enforce_session_permissions(&session, &[UserPermission::ManageLibrary])?;

	let db = &ctx.db;
	let thumbnails_dir = ctx.config.get_thumbnails_dir();

	let result = db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.include(library_thumbnails_deletion_include::include())
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	let thumbnail_config = result.library_options.thumbnail_config;
	let extension = if let Some(config) = thumbnail_config {
		ImageProcessorOptions::try_from(config).ok()
	} else {
		None
	}
	.map(|config| config.format.extension());

	let media_ids = result
		.series
		.into_iter()
		.flat_map(|s| s.media.into_iter().map(|m| m.id))
		.collect::<Vec<String>>();

	if let Some(ext) = extension {
		remove_thumbnails_of_type(&media_ids, ext, thumbnails_dir)?;
	} else {
		remove_thumbnails(&media_ids, thumbnails_dir)?;
	}

	Ok(Json(()))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateLibraryThumbnails {
	pub image_options: Option<ImageProcessorOptions>,
	#[serde(default)]
	pub force_regenerate: bool,
}

/// Generate thumbnails for all the media in a library by id, if the current user has access to it.
#[utoipa::path(
	post,
	path = "/api/v1/libraries/:id/thumbnail/generate",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
	),
	responses(
		(status = 200, description = "Successfully queued job"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn generate_library_thumbnails(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<GenerateLibraryThumbnails>,
) -> APIResult<Json<()>> {
	let user = enforce_session_permissions(&session, &[UserPermission::ManageLibrary])?;
	let library = ctx
		.db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.with(library::library_options::fetch())
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;
	let library_options = library.library_options()?.to_owned();
	let existing_options = if let Some(config) = library_options.thumbnail_config {
		// I hard error here so that we don't accidentally generate thumbnails in an invalid or
		// otherwise undesired way per the existing (but not properly parsed) config
		Some(ImageProcessorOptions::try_from(config)?)
	} else {
		None
	};
	let options = input.image_options.or(existing_options).unwrap_or_default();
	let config =
		ThumbnailGenerationJobParams::single_library(library.id, input.force_regenerate);
	ctx.enqueue_job(ThumbnailGenerationJob::new(options, config))
		.map_err(|e| {
			error!(?e, "Failed to enqueue thumbnail generation job");
			APIError::InternalServerError(
				"Failed to enqueue thumbnail generation job".to_string(),
			)
		})?;

	Ok(Json(()))
}

#[utoipa::path(
	get,
	path = "/api/v1/libraries/:id/excluded-users",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID")
	),
	responses(
		(status = 200, description = "Successfully fetched library excluded users", body = Vec<User>),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn get_library_excluded_users(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Vec<User>>> {
	enforce_session_permissions(
		&session,
		&[UserPermission::ReadUsers, UserPermission::ManageLibrary],
	)?;

	let db = &ctx.db;

	let library = db
		.library()
		.find_first(vec![library::id::equals(id.clone())])
		.with(library::hidden_from_users::fetch(vec![]))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;
	let hidden_from_users = library.hidden_from_users()?.to_owned();

	Ok(Json(
		hidden_from_users.into_iter().map(User::from).collect(),
	))
}

#[derive(Debug, Deserialize, ToSchema, Type)]
pub struct UpdateLibraryExcludedUsers {
	pub user_ids: Vec<String>,
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries/:id/excluded-users",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID")
	),
	responses(
		(status = 200, description = "Successfully updated library excluded users", body = Library),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn update_library_excluded_users(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<UpdateLibraryExcludedUsers>,
) -> APIResult<Json<Library>> {
	enforce_session_permissions(
		&session,
		&[UserPermission::ReadUsers, UserPermission::ManageLibrary],
	)?;

	let db = &ctx.db;

	let library = db
		.library()
		.find_first(vec![library::id::equals(id.clone())])
		.with(library::hidden_from_users::fetch(vec![]))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	let server_owner_in_list = db
		.user()
		.find_first(vec![
			user::id::in_vec(input.user_ids.clone()),
			user::is_server_owner::equals(true),
		])
		.exec()
		.await?
		.is_some();

	if server_owner_in_list {
		// Don't surface the fact that the server owner is in the list?
		return Err(APIError::forbidden_discreet());
	}

	let hidden_from_users = library.hidden_from_users()?.to_owned();
	let user_ids = input.user_ids;

	let to_add = user_ids
		.iter()
		.filter(|id| !hidden_from_users.iter().any(|u| u.id.eq(*id)))
		.cloned()
		.collect::<Vec<String>>();

	let to_remove = hidden_from_users
		.iter()
		.filter(|u| !user_ids.contains(&u.id))
		.map(|u| u.id.clone())
		.collect::<Vec<String>>();

	let updated_library = db
		.library()
		.update(
			library::id::equals(id.clone()),
			vec![
				library::hidden_from_users::disconnect(
					to_remove.into_iter().map(user::id::equals).collect(),
				),
				library::hidden_from_users::connect(
					to_add.into_iter().map(user::id::equals).collect(),
				),
			],
		)
		.with(library::hidden_from_users::fetch(vec![]))
		.exec()
		.await?;

	Ok(Json(Library::from(updated_library)))
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries/:id/scan",
	tag = "library",
	responses(
		(status = 200, description = "Successfully queued library scan"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Queue a ScannerJob to scan the library by id. The job, when started, is
/// executed in a separate thread.
async fn scan_library(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> Result<(), APIError> {
	let user = get_user_and_enforce_permission(&session, UserPermission::ScanLibrary)?;
	let db = &ctx.db;

	let library = db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound(format!(
			"Library with id {} not found",
			id
		)))?;

	ctx.enqueue_job(LibraryScanJob::new(library.id, library.path))
		.map_err(|e| {
			error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;

	Ok(())
}

#[derive(Debug, Deserialize, Serialize, ToSchema, Type)]
pub struct CleanLibraryResponse {
	deleted_media_count: i32,
	deleted_series_count: i32,
	is_empty: bool,
}

#[utoipa::path(
	put,
	path = "/api/v1/libraries/:id/clean",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID")
	),
	responses(
		(status = 200, description = "Successfully cleaned library"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn clean_library(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<CleanLibraryResponse>> {
	let user = get_user_and_enforce_permission(&session, UserPermission::ManageLibrary)?;

	let db = &ctx.db;
	let thumbnails_dir = ctx.config.get_thumbnails_dir();

	let result: APIResult<(CleanLibraryResponse, Vec<String>)> = db
		._transaction()
		.run(|client| async move {
			// This isn't really necessary, but it is more for RESTful patterns (i.e. error
			// if the library doesn't exist)
			let _it_exists = client
				.library()
				.find_first(vec![
					library::id::equals(id.clone()),
					library_not_hidden_from_user_filter(&user),
				])
				.exec()
				.await?
				.ok_or(APIError::NotFound("Library not found".to_string()))?;

			let delete_media_params = vec![
				media::series::is(vec![series::library_id::equals(Some(id.clone()))]),
				// Delete media that are not ready
				media::status::not(FileStatus::Ready.to_string()),
			];

			let media_to_delete = client
				.media()
				.find_many(delete_media_params.clone())
				.exec()
				.await?;

			let media_to_delete_count = media_to_delete.len();
			let media_to_delete_ids = media_to_delete
				.into_iter()
				.map(|m| m.id)
				.collect::<Vec<_>>();

			let deleted_media_count = client
				.media()
				.delete_many(delete_media_params)
				.exec()
				.await?
				.try_into()?;

			tracing::debug!(deleted_media_count, "Deleted media");

			if media_to_delete_count != deleted_media_count as usize {
				tracing::warn!(
					fetched_media_count = media_to_delete_count,
					deleted_media_count,
					"Deleted media count does not match fetched media count"
				);
			}

			let deleted_series_count = client
				.series()
				.delete_many(vec![
					series::library_id::equals(Some(id.clone())),
					or![
						// Delete series that are missing
						series::status::not(FileStatus::Ready.to_string()),
						// Delete series that have no non-missing media. Since we deleted all the media
						// above, this is effectively the same as deleting all series with no media
						not![series::media::some(vec![media::status::equals(
							FileStatus::Ready.to_string()
						)])],
					],
				])
				.exec()
				.await?
				.try_into()?;

			tracing::debug!(deleted_series_count, "Deleted series");

			let is_empty = client
				.library()
				.find_first(vec![
					library::id::equals(id.clone()),
					or![
						// There are no series
						library::series::none(vec![]),
						// All series have no media
						library::series::every(vec![series::media::none(vec![])])
					],
				])
				.exec()
				.await?
				.is_some();

			Ok((
				CleanLibraryResponse {
					deleted_media_count,
					deleted_series_count,
					is_empty,
				},
				media_to_delete_ids,
			))
		})
		.await;
	let (response, media_to_delete_ids) = result?;

	if !media_to_delete_ids.is_empty() {
		image::remove_thumbnails(&media_to_delete_ids, thumbnails_dir).map_or_else(
			|error| {
				tracing::error!(?error, "Failed to remove thumbnails for library media");
			},
			|_| {
				tracing::debug!("Removed thumbnails for deleted media");
			},
		);
	}

	Ok(Json(response))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct CreateLibrary {
	/// The name of the library to create.
	pub name: String,
	/// The path to the library to create, i.e. where the directory is on the filesystem.
	pub path: String,
	/// Optional text description of the library.
	pub description: Option<String>,
	/// Optional tags to assign to the library.
	pub tags: Option<Vec<Tag>>,
	/// Optional flag to indicate if the how the library should be scanned after creation. Default is `BATCHED`.
	pub scan_mode: Option<LibraryScanMode>,
	/// Optional options to apply to the library. When not provided, the default options will be used.
	pub library_options: Option<LibraryOptions>,
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries",
	tag = "library",
	request_body = CreateLibrary,
	responses(
		(status = 200, description = "Successfully created library"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error")
	)
)]
/// Create a new library. Will queue a ScannerJob to scan the library, and return the library
async fn create_library(
	session: Session,
	State(ctx): State<AppState>,
	Json(input): Json<CreateLibrary>,
) -> APIResult<Json<Library>> {
	let user = get_user_and_enforce_permission(&session, UserPermission::CreateLibrary)?;

	let db = &ctx.db;

	debug!(user_id = user.id, ?input, "Creating library");

	if !path::Path::new(&input.path).exists() {
		return Err(APIError::BadRequest(format!(
			"The library directory does not exist: {}",
			input.path
		)));
	}

	let child_libraries = db
		.library()
		.find_many(vec![library::path::starts_with(input.path.clone())])
		.exec()
		.await?;

	if !child_libraries.is_empty() {
		return Err(APIError::BadRequest(String::from(
			"You may not create a library that is a parent of another on the filesystem.",
		)));
	}

	// TODO(prisma 0.7.0): Nested create
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	let library_options_arg = input.library_options.unwrap_or_default();
	let transaction_result: Result<Library, APIError> = db
		._transaction()
		.run(|client| async move {
			let library_options = client
				.library_options()
				.create(vec![
					library_options::convert_rar_to_zip::set(
						library_options_arg.convert_rar_to_zip,
					),
					library_options::hard_delete_conversions::set(
						library_options_arg.hard_delete_conversions,
					),
					library_options::library_pattern::set(
						library_options_arg.library_pattern.to_string(),
					),
					library_options::thumbnail_config::set(
						library_options_arg.thumbnail_config.map(|options| {
							serde_json::to_vec(&options).unwrap_or_default()
						}),
					),
				])
				.exec()
				.await?;

			let library = client
				.library()
				.create(
					input.name.to_owned(),
					input.path.to_owned(),
					library_options::id::equals(library_options.id.clone()),
					vec![library::description::set(input.description.to_owned())],
				)
				.exec()
				.await?;

			let library_options = client
				.library_options()
				.update(
					library_options::id::equals(library_options.id),
					vec![
						library_options::library::connect(library::id::equals(
							library.id.clone(),
						)),
						library_options::library_id::set(Some(library.id.clone())),
					],
				)
				.exec()
				.await?;

			// FIXME: try and do multiple connects again soon, batching is WAY better than
			// previous solution but still...
			if let Some(tags) = input.tags.to_owned() {
				let library_id = library.id.clone();
				let tag_connect = tags.into_iter().map(|tag| {
					client.library().update(
						library::id::equals(library_id.clone()),
						vec![library::tags::connect(vec![tag::id::equals(tag.id)])],
					)
				});

				client._batch(tag_connect).await?;
			}

			Ok(Library::from((library, library_options)))
		})
		.await;

	let library = transaction_result?;
	let scan_mode = input.scan_mode.unwrap_or_default();
	if scan_mode != LibraryScanMode::None {
		ctx.enqueue_job(LibraryScanJob::new(
			library.id.clone(),
			library.path.clone(),
		))
		.map_err(|e| {
			error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;
	}

	Ok(Json(library))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct UpdateLibrary {
	pub id: String,
	/// The updated name of the library.
	pub name: String,
	/// The updated path of the library.
	pub path: String,
	/// The updated description of the library.
	pub description: Option<String>,
	/// The updated emoji for the library.
	pub emoji: Option<String>,
	/// The updated tags of the library.
	pub tags: Option<Vec<Tag>>,
	/// The tags to remove from the library.
	#[serde(default)]
	pub removed_tags: Option<Vec<Tag>>,
	/// The updated options of the library.
	pub library_options: LibraryOptions,
	/// Optional flag to indicate how the library should be automatically scanned after update. Default is `BATCHED`.
	#[serde(default)]
	pub scan_mode: Option<LibraryScanMode>,
}

#[utoipa::path(
	put,
	path = "/api/v1/libraries/:id",
	tag = "library",
	request_body = UpdateLibrary,
	params(
		("id" = String, Path, description = "The id of the library to update")
	),
	responses(
		(status = 200, description = "Successfully updated library"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Update a library by id, if the current user is a SERVER_OWNER.
async fn update_library(
	session: Session,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateLibrary>,
) -> APIResult<Json<Library>> {
	let user = get_user_and_enforce_permission(&session, UserPermission::EditLibrary)?;
	let db = &ctx.db;

	if !path::Path::new(&input.path).exists() {
		return Err(APIError::BadRequest(format!(
			"Updated path does not exist: {}",
			input.path
		)));
	}

	let _can_access = db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	let library_options = input.library_options.to_owned();

	db.library_options()
		.update(
			library_options::id::equals(library_options.id.unwrap_or_default()),
			chain_optional_iter(
				[
					library_options::convert_rar_to_zip::set(
						library_options.convert_rar_to_zip,
					),
					library_options::hard_delete_conversions::set(
						library_options.hard_delete_conversions,
					),
				],
				[library_options.thumbnail_config.map(|config| {
					library_options::thumbnail_config::set(Some(
						serde_json::to_vec(&config).unwrap_or_default(),
					))
				})],
			),
		)
		.exec()
		.await?;

	let mut batches = vec![];

	// FIXME: this is disgusting. I don't understand why the library::tag::connect doesn't
	// work with multiple tags, nor why providing multiple library::tag::connect params
	// doesn't work. Regardless, absolutely do NOT keep this. Correction required,
	// highly inefficient queries.

	if let Some(tags) = input.tags.to_owned() {
		for tag in tags {
			batches.push(db.library().update(
				library::id::equals(id.clone()),
				vec![library::tags::connect(vec![tag::id::equals(
					tag.id.to_owned(),
				)])],
			));
		}
	}

	if let Some(removed_tags) = input.removed_tags.to_owned() {
		for tag in removed_tags {
			batches.push(db.library().update(
				library::id::equals(id.clone()),
				vec![library::tags::disconnect(vec![tag::id::equals(
					tag.id.to_owned(),
				)])],
			));
		}
	}

	if !batches.is_empty() {
		db._batch(batches).await?;
	}

	let updated_library = db
		.library()
		.update(
			library::id::equals(id),
			vec![
				library::name::set(input.name),
				library::path::set(input.path),
				library::description::set(input.description),
				library::emoji::set(input.emoji),
			],
		)
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?;

	let scan_mode = input.scan_mode.unwrap_or_default();

	if scan_mode != LibraryScanMode::None {
		ctx.enqueue_job(LibraryScanJob::new(
			updated_library.id.clone(),
			updated_library.path.clone(),
		))
		.map_err(|e| {
			error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;
	}

	Ok(Json(updated_library.into()))
}

#[utoipa::path(
	delete,
	path = "/api/v1/libraries/:id",
	tag = "library",
	params(
		("id" = String, Path, description = "The id of the library to delete")
	),
	responses(
		(status = 200, description = "Successfully deleted library"),
		(status = 400, description = "Bad request"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Delete a library by id
async fn delete_library(
	session: Session,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> APIResult<Json<String>> {
	let user = get_session_server_owner_user(&session)?;
	let db = &ctx.db;
	let thumbnails_dir = ctx.config.get_thumbnails_dir();

	trace!(?id, "Attempting to delete library");

	// TODO: This is not ideal, but `delete_many` only returns affected rows, so
	// I can't do the exact same ops. I want to revisit this though, this API is one
	// of the older ones and could use a refactor
	let _can_access = db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	let deleted_library = db
		.library()
		.delete(library::id::equals(id.clone()))
		.include(library_series_ids_media_ids_include::include())
		.exec()
		.await?;

	let media_ids = deleted_library
		.series
		.into_iter()
		.flat_map(|series| series.media)
		.map(|media| media.id)
		.collect::<Vec<_>>();

	if !media_ids.is_empty() {
		trace!(?media_ids, "Deleted media");
		debug!(
			"Attempting to delete {} media thumbnails (if present)",
			media_ids.len()
		);

		if let Err(err) = image::remove_thumbnails(&media_ids, thumbnails_dir) {
			error!("Failed to remove thumbnails for library media: {:?}", err);
		} else {
			debug!("Removed thumbnails for library media (if present)");
		}
	}

	// TODO: convert to library from library_series_ids_media_ids_include::Data
	Ok(Json(deleted_library.id))
}

/// Get stats for a specific library
async fn get_library_stats(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Query(params): Query<LibraryStatsParams>,
	session: Session,
) -> APIResult<Json<LibraryStats>> {
	let user = get_session_user(&session)?;
	let db = &ctx.db;

	let stats = db
		._query_raw::<LibraryStats>(raw!(
			r#"
			WITH base_counts AS (
				SELECT
					COUNT(*) AS book_count,
					IFNULL(SUM(media.size), 0) AS total_bytes,
					IFNULL(series_count, 0) AS series_count
				FROM
					media
					INNER JOIN (
						SELECT
							COUNT(*) AS series_count
						FROM
							series)
					WHERE media.series_id IN (
						SELECT id FROM series WHERE library_id = {}
					)
			),
			progress_counts AS (
				SELECT
					IFNULL(SUM(
							CASE WHEN rp.is_completed THEN
								1
							ELSE
								0
							END),
						0) AS completed_books,
					IFNULL(SUM(
							CASE WHEN rp.is_completed THEN
								0
							ELSE
								1
							END),
						0) AS in_progress_books
				FROM
					media m
					INNER JOIN read_progresses rp ON rp.media_id = m.id
				WHERE
					rp.is_completed AND (
						{} IS TRUE OR rp.user_id = {}
					)
			)
			SELECT
				*
			FROM
				base_counts
				INNER JOIN progress_counts;
			"#,
			PrismaValue::String(id),
			PrismaValue::Boolean(params.all_users),
			PrismaValue::String(user.id)
		))
		.exec()
		.await?
		.into_iter()
		.next()
		.ok_or(APIError::InternalServerError(
			"Failed to compute stats for libraries".to_string(),
		))?;

	Ok(Json(stats))
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries/:id/analyze",
	tag = "library",
	params(
		("id" = String, Path, description = "The ID of the library to analyze")
	),
	responses(
		(status = 200, description = "Successfully started library media analysis"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn start_media_analysis(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<()> {
	let _ = enforce_session_permissions(&session, &[UserPermission::ManageLibrary])?;

	// Start analysis job
	ctx.enqueue_job(AnalyzeMediaJob::analyze_library(id))
		.map_err(|e| {
			let err = "Failed to enqueue analyze library media job";
			error!(?e, err);
			APIError::InternalServerError(err.to_string())
		})?;

	APIResult::Ok(())
}
