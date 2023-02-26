use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::get,
	Json, Router,
};
use axum_extra::extract::Query;
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::{raw, Direction};
use std::{path, str::FromStr};
use tracing::{debug, error, trace};

use stump_core::{
	db::{
		models::{LibrariesStats, Library, LibraryScanMode, Series},
		utils::PrismaCountTrait,
	},
	fs::{image, media_file},
	job::LibraryScanJob,
	prelude::{
		CreateLibraryArgs, Pageable, Pagination, PaginationQuery, ScanQueryParam,
		UpdateLibraryArgs,
	},
	prisma::{
		library::{self, WhereParam},
		library_options, media,
		series::{self, OrderByParam as SeriesOrderByParam},
		tag,
	},
};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		get_session_admin_user, http::ImageResponse, FilterableQuery, LibraryFilter,
	},
};

// TODO: .layer(from_extractor::<AdminGuard>()) where needed. Might need to remove some
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
				.route("/thumbnail", get(get_library_thumbnail)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

pub(crate) fn apply_library_filters(filters: LibraryFilter) -> Vec<WhereParam> {
	let mut _where: Vec<WhereParam> = vec![];

	if !filters.id.is_empty() {
		_where.push(library::id::in_vec(filters.id))
	}
	if !filters.name.is_empty() {
		_where.push(library::name::in_vec(filters.name));
	}

	_where
}

#[utoipa::path(
	get,
	path = "/api/v1/libraries",
	tag = "library",
	params(
		("filter_query" = FilterableLibraryQuery, Query, description = "The library filters"),
		("pagination_query" = PaginationQuery, Query, description = "The pagination options")
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
	filter_query: Query<FilterableQuery<LibraryFilter>>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Library>>>> {
	let FilterableQuery { filters, ordering } = filter_query.0.get();
	let pagination = pagination_query.0.get();

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
		.await?;

	if library.is_none() {
		return Err(ApiError::NotFound(format!(
			"Library with id {} not found",
			id
		)));
	}

	let library = library.unwrap();

	Ok(Json(library.into()))
}

#[utoipa::path(
	get,
	path = "/api/v1/libraries/:id/series",
	tag = "library",
	params(
		("id" = String, Path, description = "The library ID"),
		("filter_query" = FilterableLibraryQuery, Query, description = "The library filters"),
		("pagination_query" = PaginationQuery, Query, description = "The pagination options")
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
	filter_query: Query<FilterableQuery<LibraryFilter>>,
	pagination_query: Query<PaginationQuery>,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let FilterableQuery { ordering, .. } = filter_query.0.get();
	let pagination = pagination_query.0.get();
	let db = ctx.get_db();

	let is_unpaged = pagination.is_unpaged();
	let order_by_param: SeriesOrderByParam = ordering.try_into()?;

	let where_conditions = vec![series::library_id::equals(Some(id.clone()))];
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
async fn get_library_thumbnail(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let library_series = db
		.series()
		.find_many(vec![series::library_id::equals(Some(id.clone()))])
		.with(series::media::fetch(vec![]).order_by(media::name::order(Direction::Asc)))
		.exec()
		.await?;

	// TODO: error handling
	let series = library_series.first().expect("No series in library");
	let media = series.media()?.first().expect("No media in series");

	Ok(media_file::get_page(media.path.as_str(), 1)?.into())
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
	session: ReadableSession,
) -> Result<(), ApiError> {
	let db = ctx.get_db();
	let _user = get_session_admin_user(&session)?;

	let lib = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.exec()
		.await?;

	if lib.is_none() {
		return Err(ApiError::NotFound(format!(
			"Library with id {} not found",
			id
		)));
	}

	let lib = lib.unwrap();

	let scan_mode = query.scan_mode.to_owned().unwrap_or_default();
	let scan_mode = LibraryScanMode::from_str(&scan_mode)
		.map_err(|e| ApiError::BadRequest(format!("Invalid scan mode: {}", e)))?;

	// TODO: should this just be an error?
	if scan_mode != LibraryScanMode::None {
		let job = LibraryScanJob {
			path: lib.path,
			scan_mode,
		};

		return Ok(ctx.spawn_job(Box::new(job))?);
	}

	Ok(())
}

#[utoipa::path(
	post,
	path = "/api/v1/libraries",
	tag = "library",
	request_body = CreateLibraryArgs,
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
	session: ReadableSession,
	State(ctx): State<AppState>,
	Json(input): Json<CreateLibraryArgs>,
) -> ApiResult<Json<Library>> {
	get_session_admin_user(&session)?;

	let db = ctx.get_db();

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
					library_options::create_webp_thumbnails::set(
						library_options_arg.create_webp_thumbnails,
					),
					library_options::library_pattern::set(
						library_options_arg.library_pattern.to_string(),
					),
				])
				.exec()
				.await?;

			let library = client
				.library()
				.create(
					input.name.to_owned(),
					input.path.to_owned(),
					library_options::id::equals(library_options.id),
					vec![library::description::set(input.description.to_owned())],
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

			Ok(Library::from(library))
		})
		.await;

	let library = transaction_result?;
	let scan_mode = input.scan_mode.unwrap_or_default();
	// `scan` is not a required field, however it will default to BATCHED if not provided
	if scan_mode != LibraryScanMode::None {
		ctx.spawn_job(Box::new(LibraryScanJob {
			path: library.path.clone(),
			scan_mode,
		}))?;
	}

	Ok(Json(library))
}

#[utoipa::path(
	put,
	path = "/api/v1/libraries/:id",
	tag = "library",
	request_body = UpdateLibraryArgs,
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
	session: ReadableSession,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateLibraryArgs>,
) -> ApiResult<Json<Library>> {
	get_session_admin_user(&session)?;
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
			vec![
				library_options::convert_rar_to_zip::set(
					library_options.convert_rar_to_zip,
				),
				library_options::hard_delete_conversions::set(
					library_options.hard_delete_conversions,
				),
				library_options::create_webp_thumbnails::set(
					library_options.create_webp_thumbnails,
				),
			],
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
				library::name::set(input.name.to_owned()),
				library::path::set(input.path.to_owned()),
				library::description::set(input.description.to_owned()),
			],
		)
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?;

	let scan_mode = input.scan_mode.unwrap_or_default();

	// `scan` is not a required field, however it will default to BATCHED if not provided
	if scan_mode != LibraryScanMode::None {
		ctx.spawn_job(Box::new(LibraryScanJob {
			path: updated.path.clone(),
			scan_mode,
		}))?;
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
	session: ReadableSession,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<String>> {
	get_session_admin_user(&session)?;
	let db = ctx.get_db();

	trace!(?id, "Attempting to delete library");

	let deleted = db
		.library()
		.delete(library::id::equals(id.clone()))
		.include(library::include!({
			series: include {
				media: select {
					id
				}
			}
		}))
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
