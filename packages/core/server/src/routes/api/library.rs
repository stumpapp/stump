use prisma_client_rust::Direction;
use rocket::serde::json::Json;
use rocket_okapi::{openapi, JsonSchema};
use serde::Deserialize;

use crate::{
	fs::{self, scanner::ScannerJob},
	guards::auth::Auth,
	prisma::{library, media, series},
	types::{
		alias::{ApiResult, Context},
		errors::ApiError,
		http::ImageResponse,
		models::library::Library,
		pageable::{PageParams, Pageable, PagedRequestParams},
	},
};

/// Get the libraries accessible by the current user. Library `tags` relation is loaded
/// on this route.
#[openapi(tag = "Library")]
#[get("/libraries?<unpaged>&<page_params..>")]
pub async fn get_libraries(
	unpaged: Option<bool>,
	page_params: Option<PagedRequestParams>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<Pageable<Vec<Library>>>> {
	let db = ctx.get_db();

	let libraries = db
		.library()
		.find_many(vec![])
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?
		.into_iter()
		.map(|l| l.into())
		.collect::<Vec<Library>>();

	let unpaged = match unpaged {
		Some(val) => val,
		None => page_params.is_none(),
	};

	if unpaged {
		return Ok(Json(libraries.into()));
	}

	Ok(Json((libraries, page_params).into()))
}

/// Get a library by id, if the current user has access to it. Library `series`, `media`
/// and `tags` relations are loaded on this route.
#[openapi(tag = "Library")]
#[get("/libraries/<id>")]
pub async fn get_library_by_id(
	id: String,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	let lib = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.with(library::series::fetch(vec![]).with(series::media::fetch(vec![])))
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?;

	if lib.is_none() {
		return Err(ApiError::NotFound(format!(
			"Library with id {} not found",
			id
		)));
	}

	Ok(Json(lib.unwrap().into()))
}

/// Get the thumbnail image for a library by id, if the current user has access to it.
#[openapi(tag = "Library")]
#[get("/libraries/<id>/thumbnail")]
pub async fn get_library_thumbnail(
	id: String,
	ctx: &Context,
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

	Ok(fs::media_file::get_page(media.path.as_str(), 1, true)?)
}

/// Queue a ScannerJob to scan the library by id. The job, when started, is
/// executed in a separate thread.
#[openapi(tag = "Library")]
#[get("/libraries/<id>/scan")]
pub async fn scan_library(
	id: String,
	ctx: &Context,
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

	let job = ScannerJob {
		path: lib.path.clone(),
	};

	ctx.spawn_job(Box::new(job));

	Ok(())
}

#[derive(Deserialize, JsonSchema)]
pub struct CreateLibrary {
	name: String,
	path: String,
	description: Option<String>,
}

/// Create a new library. Will queue a ScannerJob to scan the library, and return the library
#[openapi(tag = "Library")]
#[post("/libraries", data = "<input>")]
pub async fn create_library(
	input: Json<CreateLibrary>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	let lib = db
		.library()
		.create(
			library::name::set(input.name.to_owned()),
			library::path::set(input.path.to_owned()),
			vec![library::description::set(input.description.to_owned())],
		)
		.exec()
		.await?;

	ctx.spawn_job(Box::new(ScannerJob {
		path: lib.path.clone(),
	}));

	Ok(Json(lib.into()))
}

#[derive(Deserialize, JsonSchema)]
pub struct UpdateLibrary {
	name: String,
	path: String,
	description: Option<String>,
}

/// Update a library by id, if the current user is a SERVER_OWNER.
// TODO: Scan?
#[openapi(tag = "Library")]
#[put("/libraries/<id>", data = "<input>")]
pub async fn update_library(
	id: String,
	input: Json<UpdateLibrary>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	let updated = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.update(vec![
			library::name::set(input.name.to_owned()),
			library::path::set(input.path.to_owned()),
			library::description::set(input.description.to_owned()),
		])
		.exec()
		.await?;

	if updated.is_none() {
		return Err(ApiError::NotFound(format!(
			"Library with id {} not found",
			&id
		)));
	}

	Ok(Json(updated.unwrap().into()))
}

/// Delete a library by id, if the current user is a SERVER_OWNER.
#[openapi(tag = "Library")]
#[delete("/libraries/<id>")]
pub async fn delete_library(
	id: String,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	let deleted = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.delete()
		.exec()
		.await?;

	if deleted.is_none() {
		return Err(ApiError::NotFound(format!(
			"Library with id {} not found",
			&id
		)));
	}

	Ok(Json(deleted.unwrap().into()))
}
