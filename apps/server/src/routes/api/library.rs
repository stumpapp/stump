use std::{path::Path, str::FromStr};

use prisma_client_rust::{raw, Direction};
use rocket::serde::json::Json;
use rocket_okapi::openapi;

use stump_core::{
	db::utils::PrismaCountTrait,
	fs::{image, media_file},
	job::LibraryScanJob,
	prisma::{
		library, library_options, media,
		series::{self, OrderByParam},
		tag,
	},
	types::{
		library::{LibrariesStats, Library, LibraryScanMode},
		series::Series,
		CreateLibraryArgs, FindManyTrait, PageParams, Pageable, PagedRequestParams,
		QueryOrder, UpdateLibraryArgs,
	},
};

use crate::{
	guards::auth::{AdminGuard, Auth},
	types::{errors::ApiError, http::ImageResponse, ApiResult, Ctx},
};

/// Get the libraries accessible by the current user. Library `tags` relation is loaded
/// on this route.
#[openapi(tag = "Library")]
#[get("/libraries?<unpaged>&<page_params..>")]
pub async fn get_libraries(
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Ctx,
	_auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Library>>>> {
	let db = ctx.get_db();

	let libraries = db
		.library()
		.find_many(vec![])
		.with(library::tags::fetch(vec![]))
		.with(library::library_options::fetch())
		.order_by(library::name::order(Direction::Asc))
		.exec()
		.await?
		.into_iter()
		.map(|l| l.into())
		.collect::<Vec<Library>>();

	let unpaged = unpaged.unwrap_or(page_params.is_none());

	if unpaged {
		return Ok(Json(libraries.into()));
	}

	Ok(Json((libraries, page_params).into()))
}

/// Get the stats for all libraries. Includes series count, book count and total space used (in bytes).
#[openapi(tag = "Library")]
#[get("/libraries/stats")]
pub async fn get_libraries_stats(
	ctx: &Ctx,
	// _auth: Auth,
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

/// Get a library by id, if the current user has access to it. Library `series`, `media`
/// and `tags` relations are loaded on this route.
#[openapi(tag = "Library")]
#[get("/libraries/<id>")]
pub async fn get_library_by_id(
	id: String,
	ctx: &Ctx,
	// _auth: Auth,
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

// FIXME: this is absolutely atrocious...
// This should be much better once https://github.com/Brendonovich/prisma-client-rust/issues/24 is added
// but for now I will have this disgustingly gross and ugly work around...
/// Returns the series in a given library. Will *not* load the media relation.
#[openapi(tag = "Series")]
#[get("/libraries/<id>/series?<unpaged>&<req_params..>")]
pub async fn get_library_series(
	id: String,
	unpaged: Option<bool>,
	req_params: Option<PagedRequestParams>,
	ctx: &Ctx,
	// auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Series>>>> {
	let db = ctx.get_db();

	let unpaged = unpaged.unwrap_or_else(|| req_params.is_none());
	let page_params = PageParams::from(req_params);
	let order_by_param: OrderByParam =
		QueryOrder::from(page_params.clone()).try_into()?;

	let base_query = db
		.series()
		// TODO: add media relation count....
		.find_many(vec![series::library_id::equals(Some(id.clone()))])
		.order_by(order_by_param);

	let series = match unpaged {
		true => base_query.exec().await?,
		false => base_query.paginated(page_params.clone()).exec().await?,
	};

	let series_ids = series.iter().map(|s| s.id.clone()).collect();

	let media_counts = db.series_media_count(series_ids).await?;

	let series = series
		.iter()
		.map(|s| {
			let media_count = match media_counts.get(&s.id) {
				Some(count) => count.to_owned(),
				_ => 0,
			} as i64;

			(s.to_owned(), media_count).into()
		})
		.collect::<Vec<Series>>();

	if unpaged {
		return Ok(Json(series.into()));
	}

	let series_count = db.series_count(id).await?;

	Ok(Json((series, series_count, page_params).into()))
}

/// Get the thumbnail image for a library by id, if the current user has access to it.
#[openapi(tag = "Library")]
#[get("/libraries/<id>/thumbnail")]
pub async fn get_library_thumbnail(
	id: String,
	ctx: &Ctx,
	_auth: Auth,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	let library_series = db
		.series()
		.find_many(vec![series::library_id::equals(Some(id.clone()))])
		.with(series::media::fetch(vec![]).order_by(media::name::order(Direction::Asc)))
		.exec()
		.await?;

	// TODO: error handling

	let series = library_series.first().unwrap();

	let media = series.media()?.first().unwrap();

	Ok(media_file::get_page(media.path.as_str(), 1)?)
}

/// Queue a ScannerJob to scan the library by id. The job, when started, is
/// executed in a separate thread.
#[openapi(tag = "Library")]
#[get("/libraries/<id>/scan?<scan_mode>")]
pub async fn scan_library(
	id: String,
	ctx: &Ctx,
	scan_mode: Option<&str>,
	// _auth: Auth, TODO: uncomment
) -> Result<(), ApiError> {
	let db = ctx.get_db();

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

	let scan_mode = LibraryScanMode::from_str(scan_mode.unwrap_or_default())?;

	// TODO: should this just be an error?
	if scan_mode != LibraryScanMode::None {
		let job = LibraryScanJob {
			path: lib.path.clone(),
			scan_mode,
		};

		return Ok(ctx.spawn_job(Box::new(job))?);
	}

	Ok(())
}

/// Create a new library. Will queue a ScannerJob to scan the library, and return the library
#[openapi(tag = "Library")]
#[post("/libraries", data = "<input>")]
pub async fn create_library(
	input: Json<CreateLibraryArgs>,
	ctx: &Ctx,
	_auth: Auth,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	// TODO: check library is not a parent of another library
	if !Path::new(&input.path).exists() {
		return Err(ApiError::BadRequest(format!(
			"The library directory does not exist: {}",
			input.path
		)));
	}

	// TODO: refactor once nested create is supported
	// https://github.com/Brendonovich/prisma-client-rust/issues/44

	let library_options_arg = input.library_options.to_owned().unwrap_or_default();

	// FIXME: until nested create, library_options.library_id will be NULL in the database... unless I run ANOTHER
	// update. Which I am not doing lol.
	let library_options = db
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

	let lib = db
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
		let tag_connects = tags.into_iter().map(|tag| {
			db.library().update(
				library::id::equals(lib.id.clone()),
				vec![library::tags::connect(vec![tag::id::equals(
					tag.id.to_owned(),
				)])],
			)
		});

		db._batch(tag_connects).await?;
	}

	let scan_mode = input.scan_mode.unwrap_or_default();

	// `scan` is not a required field, however it will default to BATCHED if not provided
	if scan_mode != LibraryScanMode::None {
		ctx.spawn_job(Box::new(LibraryScanJob {
			path: lib.path.clone(),
			scan_mode,
		}))?;
	}

	Ok(Json(lib.into()))
}

/// Update a library by id, if the current user is a SERVER_OWNER.
#[openapi(tag = "Library")]
#[put("/libraries/<id>", data = "<input>")]
pub async fn update_library(
	id: String,
	input: Json<UpdateLibraryArgs>,
	ctx: &Ctx,
	_auth: AdminGuard,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	if !Path::new(&input.path).exists() {
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

/// Delete a library by id, if the current user is a SERVER_OWNER.
#[openapi(tag = "Library")]
#[delete("/libraries/<id>")]
pub async fn delete_library(
	id: String,
	ctx: &Ctx,
	_auth: Auth,
) -> ApiResult<Json<String>> {
	let db = ctx.get_db();

	log::trace!("Attempting to delete library with ID {}", &id);

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

	if media_ids.len() > 0 {
		log::trace!("List of deleted media IDs: {:?}", media_ids);

		log::debug!(
			"Attempting to delete {} media thumbnails (if present)",
			media_ids.len()
		);

		if let Err(err) = image::remove_thumbnails(&media_ids) {
			log::error!("Failed to remove thumbnails for library media: {:?}", err);
		} else {
			log::info!("Removed thumbnails for library media (if present)");
		}
	}

	Ok(Json(deleted.id))
}
