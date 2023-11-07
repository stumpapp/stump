use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, post},
	Json, Router,
};
use axum_extra::extract::Query;
use prisma_client_rust::{raw, Direction};
use serde::Deserialize;
use serde_qs::axum::QsQuery;
use specta::Type;
use std::{path, str::FromStr};
use tower_sessions::Session;
use tracing::{debug, error, trace};
use utoipa::ToSchema;

use stump_core::{
	config::get_config_dir,
	db::{
		entity::{
			library_series_ids_media_ids_include, library_thumbnails_deletion_include,
			LibrariesStats, Library, LibraryOptions, LibraryScanMode, Media, Series, Tag,
			UserPermission,
		},
		query::pagination::{Pageable, Pagination, PaginationQuery},
		PrismaCountTrait,
	},
	filesystem::{
		get_unknown_thumnail,
		image::{
			self, generate_thumbnail, remove_thumbnails, remove_thumbnails_of_type,
			ImageFormat, ImageProcessorOptions, ThumbnailJob, ThumbnailJobConfig,
		},
		read_entire_file,
		scanner::LibraryScanJob,
		ContentType, FileParts, PathUtils,
	},
	prisma::{
		library::{self, WhereParam},
		library_options, media,
		media::OrderByParam as MediaOrderByParam,
		series::{self, OrderByParam as SeriesOrderByParam},
		tag,
	},
};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		chain_optional_iter, decode_path_filter, get_session_server_owner_user,
		get_session_user, get_user_and_enforce_permission, http::ImageResponse,
		FilterableQuery, LibraryBaseFilter, LibraryFilter, LibraryRelationFilter,
		MediaFilter, SeriesFilter,
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
// TODO: .layer(from_extractor::<ServerOwnerGuard>()) where needed. Might need to remove some
// of the nesting
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/libraries", get(get_libraries).post(create_library))
		.route("/libraries/stats", get(get_libraries_stats))
		.nest(
			"/libraries/:id",
			Router::new()
				.route(
					"/",
					get(get_library_by_id)
						.put(update_library)
						.delete(delete_library),
				)
				.route("/scan", get(scan_library))
				.route("/series", get(get_library_series))
				.route("/media", get(get_library_media))
				.nest(
					"/thumbnail",
					Router::new()
						.route(
							"/",
							get(get_library_thumbnail_handler)
								.patch(patch_library_thumbnail)
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

pub(crate) fn apply_library_filters(filters: LibraryFilter) -> Vec<WhereParam> {
	apply_library_base_filters(filters.base_filter)
		.into_iter()
		.chain(apply_library_relation_filters(filters.relation_filter))
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
) -> ApiResult<Json<Pageable<Vec<Library>>>> {
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	tracing::trace!(?filters, ?ordering, ?pagination, "get_libraries");

	let is_unpaged = pagination.is_unpaged();
	let where_conditions = apply_library_filters(filters);
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

#[utoipa::path(
	get,
	path = "/api/v1/libraries/stats",
	tag = "library",
	responses(
		(status = 200, description = "Successfully fetched stats", body = LibrariesStats),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error")
	)
)]
/// Get stats for all libraries
async fn get_libraries_stats(
	State(ctx): State<AppState>,
) -> ApiResult<Json<LibrariesStats>> {
	let db = ctx.get_db();

	// TODO: maybe add more, like missingBooks, idk
	let stats = db
		._query_raw::<LibrariesStats>(raw!(
			"SELECT COUNT(*) as book_count, IFNULL(SUM(media.size),0) as total_bytes, IFNULL(series_count,0) as series_count FROM media INNER JOIN (SELECT COUNT(*) as series_count FROM series)"
		))
		.exec()
		.await?
		.into_iter()
		.next();

	if stats.is_none() {
		return Err(ApiError::InternalServerError(
			"Failed to compute stats for libraries".to_string(),
		));
	}

	Ok(Json(stats.unwrap()))
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
/// Get a library by id, if the current user has access to it. Library `series`, `media`
/// and `tags` relations are loaded on this route.
async fn get_library_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	// FIXME: this query is a pain to add series->media relation counts.
	// This should be much better in https://github.com/Brendonovich/prisma-client-rust/issues/24
	// but for now I kinda have to load all the media...
	let library = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.with(library::series::fetch(vec![]))
		.with(library::library_options::fetch())
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Library not found".to_string()))?;

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
// FIXME: this is absolutely atrocious...
// This should be much better once https://github.com/Brendonovich/prisma-client-rust/issues/24 is added
// but for now I will have this disgustingly gross and ugly work around...
/// Returns the series in a given library. Will *not* load the media relation.
async fn get_library_series(
	filter_query: Query<FilterableQuery<SeriesFilter>>,
	pagination_query: Query<PaginationQuery>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery {
		ordering, filters, ..
	} = filter_query.0.get();
	let pagination = pagination_query.0.get();
	tracing::debug!(?filters, ?ordering, ?pagination, "get_library_series");

	let db = ctx.get_db();

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: SeriesOrderByParam = ordering.try_into()?;

	let where_conditions = apply_series_filters(filters)
		.into_iter()
		.chain(vec![series::library_id::equals(Some(id.clone()))])
		.collect::<Vec<series::WhereParam>>();
	let mut query = db
		.series()
		// TODO: add media relation count....
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
			_ => unreachable!(),
		}
	}

	let series = query.exec().await?;
	let series_ids = series.iter().map(|s| s.id.clone()).collect();
	let media_counts = db.series_media_count(series_ids).await?;

	let series = series
		.iter()
		.map(|s| {
			let media_count = match media_counts.get(&s.id) {
				Some(count) => count.to_owned(),
				_ => 0,
			};

			(s.to_owned(), media_count).into()
		})
		.collect::<Vec<Series>>();

	if is_unpaged {
		return Ok(Json(series.into()));
	}

	let series_count = db
		.series()
		.count(vec![series::library_id::equals(Some(id.clone()))])
		.exec()
		.await?;

	Ok(Json((series, series_count, pagination).into()))
}

async fn get_library_media(
	filter_query: Query<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Media>>>> {
	let FilterableQuery { ordering, filters } = filter_query.0.get();
	let pagination = pagination_query.0.get();
	let pagination_cloned = pagination.clone();

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let mut media_conditions = apply_media_filters(filters);
	media_conditions.push(media::series::is(vec![series::library_id::equals(Some(
		id.clone(),
	))]));

	let media_conditions_cloned = media_conditions.clone();

	let (media, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.media()
				.find_many(media_conditions_cloned.clone())
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
				.count(media_conditions_cloned)
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
) -> ApiResult<(ContentType, Vec<u8>)> {
	let thumbnails = get_config_dir().join("thumbnails");
	let library_id = library.id.clone();

	if let Some(format) = image_format.clone() {
		let extension = format.extension();

		let path = thumbnails.join(format!("{}.{}", library_id, extension));

		if path.exists() {
			tracing::trace!(?path, library_id, "Found generated library thumbnail");
			return Ok((ContentType::from(format), read_entire_file(path)?));
		}
	} else if let Some(path) = get_unknown_thumnail(&library_id) {
		tracing::debug!(path = ?path, library_id, "Found library thumbnail that does not align with config");
		let FileParts { extension, .. } = path.file_parts();
		return Ok((
			ContentType::from_extension(extension.as_str()),
			read_entire_file(path)?,
		));
	}

	get_series_thumbnail(first_series, first_book, image_format)
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
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let age_restriction = user.age_restriction;

	let first_series = db
		.series()
		// Find the first series in the library which satisfies the age restriction
		.find_first(chain_optional_iter(
			[series::library_id::equals(Some(id.clone()))],
			[age_restriction
				.as_ref()
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
		.ok_or(ApiError::NotFound("Library has no series".to_string()))?;

	let library = first_series
		.library()?
		.ok_or(ApiError::Unknown(String::from("Failed to load library")))?;
	let image_format = library
		.library_options()
		.map(LibraryOptions::from)?
		.thumbnail_config
		.map(|config| config.format);

	let first_book = first_series.media()?.first().ok_or(ApiError::NotFound(
		"Library has no media to get thumbnail from".to_string(),
	))?;

	get_library_thumbnail(library, &first_series, first_book, image_format)
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
) -> ApiResult<ImageResponse> {
	get_session_server_owner_user(&session)?;

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
		.find_first(vec![
			media::series::is(vec![series::library_id::equals(Some(id.clone()))]),
			media::id::equals(body.media_id),
		])
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
) -> ApiResult<Json<()>> {
	let db = ctx.get_db();

	let result = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.include(library_thumbnails_deletion_include::include())
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Library not found".to_string()))?;

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
		remove_thumbnails_of_type(&media_ids, ext)?;
	} else {
		remove_thumbnails(&media_ids)?;
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
	Json(input): Json<GenerateLibraryThumbnails>,
) -> ApiResult<Json<()>> {
	let library = ctx
		.db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.with(library::library_options::fetch())
		.exec()
		.await?
		.ok_or(ApiError::NotFound("Library not found".to_string()))?;
	let library_options = library.library_options()?.to_owned();
	let existing_options = if let Some(config) = library_options.thumbnail_config {
		// I hard error here so that we don't accidentally generate thumbnails in an invalid or
		// otherwise undesired way per the existing (but not properly parsed) config
		Some(ImageProcessorOptions::try_from(config)?)
	} else {
		None
	};
	let options = input.image_options.or(existing_options).unwrap_or_default();
	let config = ThumbnailJobConfig::SingleLibrary {
		library_id: library.id,
		force_regenerate: input.force_regenerate,
	};
	tracing::trace!(?options, ?config, "Dispatching thumbnail job");

	ctx.dispatch_job(ThumbnailJob::new(options, config))?;

	Ok(Json(()))
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ScanQueryParam {
	scan_mode: Option<String>,
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries/:id/scan",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
		("query" = ScanQueryParam, Query, description = "The scan options"),
	),
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
	query: Query<ScanQueryParam>,
	session: Session,
) -> Result<(), ApiError> {
	let db = ctx.get_db();

	get_user_and_enforce_permission(&session, UserPermission::ScanLibrary)?;

	let library = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.exec()
		.await?
		.ok_or(ApiError::NotFound(format!(
			"Library with id {} not found",
			id
		)))?;

	let scan_mode = query.scan_mode.to_owned().unwrap_or_default();
	let scan_mode = LibraryScanMode::from_str(&scan_mode)
		.map_err(|e| ApiError::BadRequest(format!("Invalid scan mode: {}", e)))?;

	ctx.dispatch_job(LibraryScanJob::new(library.path, scan_mode))?;

	Ok(())
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
) -> ApiResult<Json<Library>> {
	let user = get_session_server_owner_user(&session)?;
	let db = ctx.get_db();

	debug!(user_id = user.id, ?input, "Creating library");

	if !path::Path::new(&input.path).exists() {
		return Err(ApiError::BadRequest(format!(
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
		return Err(ApiError::BadRequest(String::from(
			"You may not create a library that is a parent of another on the filesystem.",
		)));
	}

	// TODO: refactor once nested create is supported
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	let library_options_arg = input.library_options.unwrap_or_default();
	let transaction_result: Result<Library, ApiError> = db
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
	ctx.dispatch_job(LibraryScanJob::new(library.path.clone(), scan_mode))?;

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
) -> ApiResult<Json<Library>> {
	get_session_server_owner_user(&session)?;
	let db = ctx.get_db();

	if !path::Path::new(&input.path).exists() {
		return Err(ApiError::BadRequest(format!(
			"Updated path does not exist: {}",
			input.path
		)));
	}

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

	let updated = db
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
		ctx.dispatch_job(LibraryScanJob::new(updated.path.clone(), scan_mode))?;
	}

	Ok(Json(updated.into()))
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
) -> ApiResult<Json<String>> {
	get_session_server_owner_user(&session)?;
	let db = ctx.get_db();

	trace!(?id, "Attempting to delete library");

	let deleted = db
		.library()
		.delete(library::id::equals(id.clone()))
		.include(library_series_ids_media_ids_include::include())
		.exec()
		.await?;

	let media_ids = deleted
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

		if let Err(err) = image::remove_thumbnails(&media_ids) {
			error!("Failed to remove thumbnails for library media: {:?}", err);
		} else {
			debug!("Removed thumbnails for library media (if present)");
		}
	}

	Ok(Json(deleted.id))
}
