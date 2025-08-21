use axum::{
	extract::{DefaultBodyLimit, Multipart, Path, Query, State},
	middleware,
	routing::{get, post, put},
	Extension, Json, Router,
};
use chrono::{DateTime, Duration, FixedOffset};
use models::shared::image_processor_options::{
	ImageProcessorOptions, SupportedImageFormat,
};
use prisma_client_rust::{chrono::Utc, not, or, raw, Direction, PrismaValue};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use serde_with::skip_serializing_none;
use specta::Type;
use std::path;
use tokio::fs;
use tracing::{debug, error, trace};

use stump_core::{
	config::StumpConfig,
	db::{
		entity::{
			macros::{
				library_idents_select, library_scan_details,
				library_series_ids_media_ids_include, library_tags_select,
				library_thumbnails_deletion_include, series_or_library_thumbnail,
			},
			FileStatus, Library, LibraryConfig, LibraryScanMode, LibraryStats, Media,
			Series, TagName, User, UserPermission,
		},
		query::pagination::{
			Pageable, PageableLibraries, PageableSeries, Pagination, PaginationQuery,
		},
		PrismaCountTrait,
	},
	filesystem::{
		get_thumbnail,
		image::{
			self, generate_book_thumbnail, place_thumbnail, remove_thumbnails,
			GenerateThumbnailOptions, ThumbnailGenerationJob,
			ThumbnailGenerationJobParams,
		},
		media::analyze_media_job::AnalyzeMediaJob,
		scanner::{LastLibraryScan, LibraryScanJob, LibraryScanRecord, ScanOptions},
		ContentType,
	},
	prisma::{
		last_library_visit, library, library_config, library_scan_record,
		media::{self, OrderByParam as MediaOrderByParam},
		series::{self, OrderByParam as SeriesOrderByParam},
		tag, user,
	},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{
		chain_optional_iter, FilterableLibraryQuery, FilterableQuery, LibraryFilter,
		MediaFilter, SeriesFilter,
	},
	middleware::auth::{auth_middleware, AuthContext},
	routers::api::filters::{
		apply_library_filters_for_user, apply_media_age_restriction, apply_media_filters,
		apply_media_pagination, apply_series_age_restriction, apply_series_filters,
		library_not_hidden_from_user_filter,
	},
	utils::{http::ImageResponse, validate_and_load_image},
};

use super::series::get_series_thumbnail;

// TODO: age restrictions!
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/libraries", get(get_libraries).post(create_library))
		.route("/libraries/stats", get(get_libraries_stats))
		.nest(
			"/libraries/last-visited",
			Router::new()
				.route("/", get(get_last_visited_library))
				.route("/{id}", put(update_last_visited_library)),
		)
		.nest(
			"/libraries/{id}",
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
				.route("/last-scan", get(get_library_last_scan))
				.route(
					"/scan-history",
					get(get_library_scan_history).delete(delete_library_scan_history),
				)
				.route("/scan", post(scan_library))
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
								.layer(DefaultBodyLimit::max(
									app_state.config.max_image_upload_size,
								))
								.delete(delete_library_thumbnails),
						)
						.route("/generate", post(generate_library_thumbnails)),
				),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Pageable<Vec<Library>>>> {
	let user = req.user();
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

	tracing::trace!(?filters, ?ordering, ?pagination, "get_libraries");

	let is_unpaged = pagination.is_unpaged();
	let where_conditions = apply_library_filters_for_user(filters, user);
	let order_by = ordering.try_into()?;

	let mut query = ctx
		.db
		.library()
		.find_many(where_conditions.clone())
		.with(library::tags::fetch(vec![]))
		.with(library::config::fetch())
		.order_by(order_by);

	if !is_unpaged {
		match pagination.clone() {
			Pagination::Page(page_query) => {
				let (skip, take) = page_query.get_skip_take();
				query = query.skip(skip).take(take);
			},
			Pagination::Cursor(cursor_query) => {
				if let Some(cursor) = cursor_query.cursor {
					query = query.cursor(library::id::equals(cursor)).skip(1);
				}
				if let Some(limit) = cursor_query.limit {
					query = query.take(limit);
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Option<Library>>> {
	let client = &ctx.db;
	let user = req.user();

	let last_visited_library = client
		.last_library_visit()
		.find_first(vec![last_library_visit::user_id::equals(user.id.clone())])
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Library>> {
	let client = &ctx.db;
	let user = req.user();

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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<LibraryStats>> {
	let user = req.user();
	let db = &ctx.db;

	let stats = db
		._query_raw::<LibraryStats>(raw!(
			r"
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
					COUNT(frs.id) AS completed_books,
					COUNT(rs.id) AS in_progress_books
				FROM
					media m
					LEFT JOIN finished_reading_sessions frs ON frs.media_id = m.id
					LEFT JOIN reading_sessions rs ON rs.media_id = m.id
				WHERE {} IS TRUE OR (rs.user_id = {} OR frs.user_id = {})
			)
			SELECT
				*
			FROM
				base_counts
				INNER JOIN progress_counts;
			",
			PrismaValue::Boolean(params.all_users),
			PrismaValue::String(user.id.clone()),
			PrismaValue::String(user.id.clone())
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
	path = "/api/v1/libraries/{id}",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Library>> {
	let user = req.user();
	let db = &ctx.db;

	let library = db
		.library()
		.find_first(
			[library::id::equals(id.clone())]
				.into_iter()
				.chain([library_not_hidden_from_user_filter(user)])
				.collect(),
		)
		.with(library::config::fetch())
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	Ok(Json(library.into()))
}

// TODO: remove? Not used on client
#[utoipa::path(
	get,
	path = "/api/v1/libraries/{id}/series",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery {
		ordering, filters, ..
	} = filter_query.0.get();
	let pagination = pagination_query.0.get();
	tracing::debug!(?filters, ?ordering, ?pagination, "get_library_series");

	let db = &ctx.db;

	let user = req.user();
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
				series::library::is(vec![library_not_hidden_from_user_filter(user)]),
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
					query = query.cursor(series::id::equals(cursor)).skip(1);
				}
				if let Some(limit) = cursor_query.limit {
					query = query.take(limit);
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

// TODO: remove? Not used on client
async fn get_library_media(
	filter_query: Query<FilterableQuery<MediaFilter>>,
	pagination_query: Query<PaginationQuery>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Pageable<Vec<Media>>>> {
	let user = req.user();

	let FilterableQuery { ordering, filters } = filter_query.0.get();
	let pagination = pagination_query.0.get();
	let pagination_cloned = pagination.clone();

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: MediaOrderByParam = ordering.try_into()?;

	let media_conditions = apply_media_filters(filters)
		.into_iter()
		.chain([media::series::is(vec![
			series::library_id::equals(Some(id.clone())),
			series::library::is(vec![library_not_hidden_from_user_filter(user)]),
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

pub(crate) async fn get_library_thumbnail(
	id: &str,
	first_series: series_or_library_thumbnail::Data,
	first_book: Option<series_or_library_thumbnail::media::Data>,
	image_format: Option<SupportedImageFormat>,
	config: &StumpConfig,
) -> APIResult<(ContentType, Vec<u8>)> {
	let generated_thumb =
		get_thumbnail(config.get_thumbnails_dir(), id, image_format.clone()).await?;

	if let Some((content_type, bytes)) = generated_thumb {
		Ok((content_type, bytes))
	} else {
		get_series_thumbnail(&first_series.id, first_book, image_format, config).await
	}
}

// TODO: ImageResponse for utoipa
#[utoipa::path(
	get,
	path = "/api/v1/libraries/{id}/thumbnail",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<ImageResponse> {
	let db = &ctx.db;

	let user = req.user();
	let age_restriction = user.age_restriction.as_ref();

	let series_filters = chain_optional_iter(
		[
			series::library_id::equals(Some(id.clone())),
			series::library::is(vec![library_not_hidden_from_user_filter(user)]),
		],
		[age_restriction
			.map(|ar| apply_series_age_restriction(ar.age, ar.restrict_on_unset))],
	);
	let book_filters = chain_optional_iter(
		[],
		[age_restriction
			.as_ref()
			.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset))],
	);

	let first_series = db
		.series()
		.find_first(series_filters)
		.order_by(series::name::order(Direction::Asc))
		.select(series_or_library_thumbnail::select(book_filters))
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library has no series".to_string()))?;
	let first_book = first_series.media.first().cloned();

	let library_config = first_series
		.library
		.as_ref()
		.map(|l| l.config.clone())
		.map(LibraryConfig::from);
	// let image_format = library_config.and_then(|o| o.thumbnail_config.map(|c| c.format));
	// TODO(sea-orm): Fix
	let image_format: Option<SupportedImageFormat> = None;

	get_library_thumbnail(&id, first_series, first_book, image_format, &ctx.config)
		.await
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
    path = "/api/v1/libraries/{id}/thumbnail",
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
	Extension(req): Extension<AuthContext>,
	Json(body): Json<PatchLibraryThumbnail>,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;

	let client = &ctx.db;

	let target_page = body.is_zero_based.map_or(body.page, |is_zero_based| {
		if is_zero_based {
			body.page + 1
		} else {
			body.page
		}
	});

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
				.with(series::library::fetch().with(library::config::fetch())),
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

	// TODO(sea-orm): Fix
	unimplemented!("SeaORM migration")

	// let image_options = library
	// 	.config()?
	// 	.thumbnail_config
	// 	.clone()
	// 	.map(ImageProcessorOptions::try_from)
	// 	.transpose()?
	// 	.unwrap_or_else(|| {
	// 		tracing::warn!(
	// 			"Failed to parse existing thumbnail config! Using a default config"
	// 		);
	// 		ImageProcessorOptions::default()
	// 	})
	// 	.with_page(target_page);

	// let format = image_options.format.clone();

	// let (_, path_buf, _) = generate_book_thumbnail(
	// 	&media,
	// 	GenerateThumbnailOptions {
	// 		image_options,
	// 		core_config: ctx.config.as_ref().clone(),
	// 		force_regen: true,
	// 		filename: Some(id.clone()),
	// 	},
	// )
	// .await?;

	// Ok(ImageResponse::from((
	// 	ContentType::from(format),
	// 	fs::read(path_buf).await?,
	// )))
}

async fn replace_library_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	mut upload: Multipart,
) -> APIResult<ImageResponse> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
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

	let upload_data =
		validate_and_load_image(&mut upload, Some(ctx.config.max_image_upload_size))
			.await?;

	let ext = upload_data.content_type.extension();
	let library_id = library.id;

	// Note: I chose to *safely* attempt the removal as to not block the upload, however after some
	// user testing I'd like to see if this becomes a problem. We'll see!
	match remove_thumbnails(&[library_id.clone()], &ctx.config.get_thumbnails_dir()).await
	{
		Ok(count) => tracing::info!("Removed {} thumbnails!", count),
		Err(e) => tracing::error!(
			?e,
			"Failed to remove existing library thumbnail before replacing!"
		),
	}

	let path_buf =
		place_thumbnail(&library_id, ext, &upload_data.bytes, &ctx.config).await?;

	Ok(ImageResponse::from((
		upload_data.content_type,
		fs::read(path_buf).await?,
	)))
}

// TODO: support all vs just library thumb
/// Deletes all media thumbnails in a library by id, if the current user has access to it.
#[utoipa::path(
	delete,
	path = "/api/v1/libraries/{id}/thumbnail",
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
async fn delete_library_thumbnails(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;

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

	let media_ids = result
		.series
		.into_iter()
		.flat_map(|s| s.media.into_iter().map(|m| m.id))
		.collect::<Vec<String>>();

	remove_thumbnails(&media_ids, &thumbnails_dir).await?;

	Ok(Json(()))
}

#[skip_serializing_none]
#[derive(Debug, Deserialize, ToSchema, Type)]
pub struct GenerateLibraryThumbnails {
	// pub image_options: Option<ImageProcessorOptions>,
	#[serde(default)]
	pub force_regenerate: bool,
}

/// Generate thumbnails for all the media in a library by id, if the current user has access to it.
#[utoipa::path(
	post,
	path = "/api/v1/libraries/{id}/thumbnail/generate",
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
	Extension(req): Extension<AuthContext>,
	Json(input): Json<GenerateLibraryThumbnails>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;
	let library = ctx
		.db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.with(library::config::fetch())
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;
	let library_config = library.config()?.to_owned();
	// let existing_options = if let Some(config) = library_config.thumbnail_config {
	// 	// I hard error here so that we don't accidentally generate thumbnails in an invalid or
	// 	// otherwise undesired way per the existing (but not properly parsed) config
	// 	Some(ImageProcessorOptions::try_from(config)?)
	// } else {
	// 	None
	// };
	// let options = input.image_options.or(existing_options).unwrap_or_default();
	let config =
		ThumbnailGenerationJobParams::single_library(library.id, input.force_regenerate);
	// TODO(sea-orm): Fix
	ctx.enqueue_job(ThumbnailGenerationJob::new(
		ImageProcessorOptions::default(),
		config,
	))
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
	path = "/api/v1/libraries/{id}/excluded-users",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<User>>> {
	req.enforce_permissions(&[UserPermission::ReadUsers, UserPermission::ManageLibrary])?;

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
	path = "/api/v1/libraries/{id}/excluded-users",
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
	Extension(req): Extension<AuthContext>,
	Json(input): Json<UpdateLibraryExcludedUsers>,
) -> APIResult<Json<Library>> {
	req.enforce_permissions(&[UserPermission::ReadUsers, UserPermission::ManageLibrary])?;

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

#[derive(Debug, Deserialize, Serialize, ToSchema, Type)]
pub struct LastScanDetails {
	last_scanned_at: Option<DateTime<FixedOffset>>,
	last_scan: Option<LastLibraryScan>,
}

#[utoipa::path(
	get,
	path = "/api/v1/libraries/{id}/last-scan",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID")
	),
	responses(
		(status = 200, description = "Successfully fetched library last scan details", body = LastScanDetails),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
/// Get the last scan details for a library by id, if the current user has access to it.
/// This includes the last scanned at timestamp and the last custom scan details.
async fn get_library_last_scan(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<LastScanDetails>> {
	let client = &ctx.db;

	let record = client
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(req.user()),
		])
		.with(
			library::scan_history::fetch(vec![])
				.order_by(library_scan_record::timestamp::order(Direction::Desc)),
		)
		.select(library_scan_details::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;

	let last_scan = record
		.scan_history
		.first()
		.cloned()
		.map(LastLibraryScan::try_from)
		.transpose()?;
	let last_scanned_at = record.last_scanned_at;

	Ok(Json(LastScanDetails {
		last_scanned_at,
		last_scan,
	}))
}

async fn get_library_scan_history(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<LibraryScanRecord>>> {
	let client = &ctx.db;

	let records = client
		.library_scan_record()
		.find_many(vec![library_scan_record::library::is(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(req.user()),
		])])
		.order_by(library_scan_record::timestamp::order(Direction::Desc))
		.exec()
		.await?;

	let scan_history = records
		.into_iter()
		.map(LibraryScanRecord::try_from)
		.collect::<Result<_, _>>()?;

	Ok(Json(scan_history))
}

async fn delete_library_scan_history(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<()>> {
	req.enforce_permissions(&[UserPermission::ManageLibrary])?;

	let client = &ctx.db;

	let affected_rows = client
		.library_scan_record()
		.delete_many(vec![library_scan_record::library::is(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(req.user()),
		])])
		.exec()
		.await?;
	tracing::debug!(affected_rows, "Deleted library scan history records");

	Ok(Json(()))
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries/{id}/scan",
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
#[tracing::instrument(skip(ctx, req))]
async fn scan_library(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(options): Json<Option<ScanOptions>>,
) -> Result<(), APIError> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ScanLibrary])?;
	let db = &ctx.db;

	let library = db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.select(library_idents_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound(format!(
			"Library with id {id} not found"
		)))?;

	ctx.enqueue_job(LibraryScanJob::new(library.id, library.path, options))
		.map_err(|e| {
			error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;
	tracing::debug!("Enqueued library scan job");

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
	path = "/api/v1/libraries/{id}/clean",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<CleanLibraryResponse>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::ManageLibrary])?;

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
		image::remove_thumbnails(&media_to_delete_ids, &thumbnails_dir)
			.await
			.map_or_else(
				|error| {
					tracing::error!(
						?error,
						"Failed to remove thumbnails for library media"
					);
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
	#[specta(optional)]
	pub description: Option<String>,
	/// Optional tags to assign to the library.
	#[specta(optional)]
	pub tags: Option<Vec<TagName>>,
	/// Optional flag to indicate if the how the library should be scanned after creation. Default is `BATCHED`.
	#[specta(optional)]
	pub scan_mode: Option<LibraryScanMode>,
	/// Optional options to apply to the library. When not provided, the default options will be used.
	#[specta(optional)]
	pub config: Option<LibraryConfig>,
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
#[tracing::instrument(skip(ctx, req))]
async fn create_library(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
	Json(input): Json<CreateLibrary>,
) -> APIResult<Json<Library>> {
	req.enforce_permissions(&[UserPermission::CreateLibrary])?;
	let db = &ctx.db;

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

	// TODO(prisma-nested-create): Refactor once nested create is supported
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	let library_config = input.config.unwrap_or_default();
	let watch = library_config.watch;
	let path = input.path.clone();
	let transaction_result: Result<Library, APIError> = db
		._transaction()
		.with_timeout(Duration::seconds(30).num_milliseconds() as u64)
		.run(|client| async move {
			let ignore_rules = (!library_config.ignore_rules.is_empty())
				.then(|| library_config.ignore_rules.as_bytes())
				.transpose()?;
			// let thumbnail_config = library_config
			// 	.thumbnail_config
			// 	.map(|options| options.as_bytes())
			// 	.transpose()?;

			let library_config = client
				.library_config()
				.create(vec![
					library_config::convert_rar_to_zip::set(
						library_config.convert_rar_to_zip,
					),
					library_config::hard_delete_conversions::set(
						library_config.hard_delete_conversions,
					),
					library_config::process_metadata::set(
						library_config.process_metadata,
					),
					library_config::generate_file_hashes::set(
						library_config.generate_file_hashes,
					),
					library_config::generate_koreader_hashes::set(
						library_config.generate_koreader_hashes,
					),
					library_config::default_reading_dir::set(
						library_config.default_reading_dir.to_string(),
					),
					library_config::default_reading_image_scale_fit::set(
						library_config.default_reading_image_scale_fit.to_string(),
					),
					library_config::default_reading_mode::set(
						library_config.default_reading_mode.to_string(),
					),
					library_config::library_pattern::set(
						library_config.library_pattern.to_string(),
					),
					// library_config::thumbnail_config::set(thumbnail_config),
					library_config::ignore_rules::set(ignore_rules),
					library_config::watch::set(library_config.watch),
				])
				.exec()
				.await?;

			let library_tags = match input.tags {
				Some(tags) => {
					let mut existing_tags = client
						.tag()
						.find_many(vec![tag::name::in_vec(tags.clone())])
						.exec()
						.await?;

					let tags_to_create = tags
						.into_iter()
						.filter(|tag| !existing_tags.iter().any(|t| t.name == *tag))
						.collect::<Vec<_>>();

					tracing::trace!(?existing_tags, ?tags_to_create);

					// Note: ._batch was erroring during the transaction
					if !tags_to_create.is_empty() {
						let created_tags_len = client
							.tag()
							.create_many(
								tags_to_create
									.iter()
									.map(|tag| (tag.clone(), vec![]))
									.collect(),
							)
							.exec()
							.await?;
						tracing::trace!(?created_tags_len, "Created tags");
						let created_tags = client
							.tag()
							.find_many(vec![tag::name::in_vec(tags_to_create)])
							.exec()
							.await?;
						existing_tags.extend(created_tags);
					}

					existing_tags
				},
				None => vec![],
			};

			tracing::trace!(?library_tags, "Resolved tags");

			let library = client
				.library()
				.create(
					input.name.clone(),
					input.path.clone(),
					library_config::id::equals(library_config.id.clone()),
					chain_optional_iter(
						[library::description::set(input.description.clone())],
						[(!library_tags.is_empty()).then(|| {
							library::tags::connect(
								library_tags
									.into_iter()
									.map(|tag| tag::id::equals(tag.id))
									.collect(),
							)
						})],
					),
				)
				.exec()
				.await?;

			let library_config = client
				.library_config()
				.update(
					library_config::id::equals(library_config.id),
					vec![
						library_config::library::connect(library::id::equals(
							library.id.clone(),
						)),
						library_config::library_id::set(Some(library.id.clone())),
					],
				)
				.exec()
				.await?;

			Ok(Library::from((library, library_config)))
		})
		.await;

	let library = transaction_result?;
	let scan_mode = input.scan_mode.unwrap_or_default();
	if scan_mode != LibraryScanMode::None {
		ctx.enqueue_job(LibraryScanJob::new(
			library.id.clone(),
			library.path.clone(),
			None,
		))
		.map_err(|e| {
			error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;
	}

	if watch {
		ctx.library_watcher
			.add_watcher(path.into())
			.await
			.map_err(|e| {
				error!(?e, "Failed to add library watcher");
				APIError::InternalServerError("Failed to add library watcher".to_string())
			})?;
	}

	Ok(Json(library))
}

#[derive(Deserialize, Debug, Type, ToSchema)]
pub struct UpdateLibrary {
	/// The updated name of the library.
	pub name: String,
	/// The updated path of the library.
	pub path: String,
	/// The updated description of the library.
	#[specta(optional)]
	pub description: Option<String>,
	/// The updated emoji for the library.
	#[specta(optional)]
	pub emoji: Option<String>,
	/// The updated tags of the library.
	#[specta(optional)]
	pub tags: Option<Vec<TagName>>,
	/// The updated options of the library.
	pub config: LibraryConfig,
	/// Optional flag to indicate how the library should be automatically scanned after update. Default is `BATCHED`.
	#[serde(default)]
	pub scan_mode: Option<LibraryScanMode>,
}

// TODO(prisma-nested-create): Refactor once nested create is supported
#[utoipa::path(
	put,
	path = "/api/v1/libraries/{id}",
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
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateLibrary>,
) -> APIResult<Json<Library>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::EditLibrary])?;
	let db = &ctx.db;

	if !path::Path::new(&input.path).exists() {
		return Err(APIError::BadRequest(format!(
			"Updated path does not exist: {}",
			input.path
		)));
	}

	let existing_library = db
		.library()
		.find_first(vec![
			library::id::equals(id.clone()),
			library_not_hidden_from_user_filter(&user),
		])
		.select(library_tags_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound("Library not found".to_string()))?;
	let existing_tags = existing_library.tags;

	let watch = input.config.watch;
	let path = input.path.clone();
	let update_result: Result<Library, APIError> = db
		._transaction()
		.with_timeout(Duration::seconds(30).num_milliseconds() as u64)
		.run(|client| async move {
			let library_config = input.config.to_owned();
			let ignore_rules = (!library_config.ignore_rules.is_empty())
				.then(|| library_config.ignore_rules.as_bytes())
				.transpose()?;
			// let thumbnail_config = library_config
			// 	.thumbnail_config
			// 	.map(|options| options.as_bytes())
			// 	.transpose()?;

			client
				.library_config()
				.update(
					library_config::id::equals(library_config.id.unwrap_or_default()),
					vec![
						library_config::convert_rar_to_zip::set(
							library_config.convert_rar_to_zip,
						),
						library_config::hard_delete_conversions::set(
							library_config.hard_delete_conversions,
						),
						library_config::process_metadata::set(
							library_config.process_metadata,
						),
						library_config::default_reading_dir::set(
							library_config.default_reading_dir.to_string(),
						),
						library_config::default_reading_image_scale_fit::set(
							library_config.default_reading_image_scale_fit.to_string(),
						),
						library_config::default_reading_mode::set(
							library_config.default_reading_mode.to_string(),
						),
						library_config::generate_file_hashes::set(
							library_config.generate_file_hashes,
						),
						library_config::generate_koreader_hashes::set(
							library_config.generate_koreader_hashes,
						),
						library_config::ignore_rules::set(ignore_rules),
						library_config::watch::set(library_config.watch),
						// library_config::thumbnail_config::set(thumbnail_config),
					],
				)
				.exec()
				.await?;

			let (tags_to_connect, tags_to_disconnect) = match input.tags {
				Some(tag_names) => {
					let tags_not_in_existing = tag_names
						.clone()
						.into_iter()
						.filter(|name| !existing_tags.iter().any(|t| t.name == *name))
						.collect::<Vec<_>>();

					let tags_to_add_which_already_exist = client
						.tag()
						.find_many(vec![tag::name::in_vec(tags_not_in_existing.clone())])
						.exec()
						.await?;
					let tags_to_create = tags_not_in_existing
						.into_iter()
						.filter(|name| {
							!tags_to_add_which_already_exist
								.iter()
								.any(|t| t.name == *name)
						})
						.collect::<Vec<_>>();

					// Note: ._batch caused the transaction to fail
					let created_tags = {
						let created_tags_len = client
							.tag()
							.create_many(
								tags_to_create
									.iter()
									.map(|tag| (tag.clone(), vec![]))
									.collect(),
							)
							.exec()
							.await?;
						tracing::trace!(?created_tags_len, "Created tags");

						client
							.tag()
							.find_many(vec![tag::name::in_vec(tags_to_create)])
							.exec()
							.await
					}?;

					let tags_to_connect = tags_to_add_which_already_exist
						.into_iter()
						.chain(created_tags.into_iter())
						.collect::<Vec<_>>();

					let tags_to_disconnect = existing_tags
						.into_iter()
						.filter(|tag| !tag_names.contains(&tag.name))
						.collect::<Vec<_>>();

					(tags_to_connect, tags_to_disconnect)
				},
				None if !existing_tags.is_empty() => (vec![], existing_tags),
				_ => (vec![], vec![]),
			};

			let set_params = chain_optional_iter(
				[
					library::name::set(input.name),
					library::path::set(input.path),
					library::description::set(input.description),
					library::emoji::set(input.emoji),
				],
				[
					(!tags_to_connect.is_empty()).then(|| {
						library::tags::connect(
							tags_to_connect
								.into_iter()
								.map(|tag| tag::id::equals(tag.id))
								.collect(),
						)
					}),
					(!tags_to_disconnect.is_empty()).then(|| {
						library::tags::disconnect(
							tags_to_disconnect
								.into_iter()
								.map(|tag| tag::id::equals(tag.id))
								.collect(),
						)
					}),
				],
			);

			Ok(client
				.library()
				.update(library::id::equals(id), set_params)
				.with(library::tags::fetch(vec![]))
				.exec()
				.await
				.map(Library::from)?)
		})
		.await;
	let updated_library = update_result?;

	let scan_mode = input.scan_mode.unwrap_or_default();

	if scan_mode != LibraryScanMode::None {
		ctx.enqueue_job(LibraryScanJob::new(
			updated_library.id.clone(),
			updated_library.path.clone(),
			None,
		))
		.map_err(|e| {
			error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;
	}

	if watch {
		ctx.library_watcher
			.add_watcher(path.into())
			.await
			.map_err(|e| {
				error!(?e, "Failed to add library watcher");
				APIError::InternalServerError("Failed to add library watcher".to_string())
			})?;
	} else {
		ctx.library_watcher
			.remove_watcher(path.into())
			.await
			.map_err(|e| {
				error!(?e, "Failed to remove library watcher");
				APIError::InternalServerError(
					"Failed to remove library watcher".to_string(),
				)
			})?;
	}

	Ok(Json(updated_library))
}

#[utoipa::path(
	delete,
	path = "/api/v1/libraries/{id}",
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
	Extension(req): Extension<AuthContext>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> APIResult<Json<String>> {
	let user = req.user_and_enforce_permissions(&[UserPermission::DeleteLibrary])?;
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

		if let Err(err) = image::remove_thumbnails(&media_ids, &thumbnails_dir).await {
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<LibraryStats>> {
	let user = req.user();
	let db = &ctx.db;

	let stats = db
		._query_raw::<LibraryStats>(raw!(
			r"
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
					COUNT(frs.id) AS completed_books,
					COUNT(rs.id) AS in_progress_books
				FROM
					media m
					LEFT JOIN finished_reading_sessions frs ON frs.media_id = m.id
					LEFT JOIN reading_sessions rs ON rs.media_id = m.id
				WHERE {} IS TRUE OR (rs.user_id = {} OR frs.user_id = {}) AND m.series_id IN (
					SELECT id FROM series WHERE library_id = {}
				)
			)
			SELECT
				*
			FROM
				base_counts
				INNER JOIN progress_counts;
			",
			PrismaValue::String(id.clone()),
			PrismaValue::Boolean(params.all_users),
			PrismaValue::String(user.id.clone()),
			PrismaValue::String(user.id.clone()),
			PrismaValue::String(id)
		))
		.exec()
		.await?
		.into_iter()
		.next()
		.ok_or(APIError::InternalServerError(
			"Failed to compute stats for library".to_string(),
		))?;

	Ok(Json(stats))
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries/{id}/analyze",
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
	Extension(req): Extension<AuthContext>,
) -> APIResult<()> {
	req.enforce_permissions(&[UserPermission::ManageLibrary])?;

	// Start analysis job
	ctx.enqueue_job(AnalyzeMediaJob::analyze_library(id))
		.map_err(|e| {
			let err = "Failed to enqueue analyze library media job";
			error!(?e, err);
			APIError::InternalServerError(err.to_string())
		})?;

	APIResult::Ok(())
}
