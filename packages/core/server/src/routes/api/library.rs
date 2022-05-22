use prisma_client_rust::Direction;
use rocket::serde::json::Json;
use serde::Deserialize;

use crate::{
	fs::{self, scanner::ScannerJob},
	guards::auth::Auth,
	prisma::{library, media, series},
	types::{
		alias::{ApiResult, Context},
		errors::ApiError,
		http::ImageResponse,
	},
};

#[get("/libraries")]
pub async fn get_libraries(
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<Vec<library::Data>>> {
	let db = ctx.get_db();

	Ok(Json(db.library().find_many(vec![]).exec().await?))
}

#[get("/libraries/<id>")]
pub async fn get_library_by_id(
	id: String,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<library::Data>> {
	let db = ctx.get_db();

	let lib = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.with(library::series::fetch(vec![]).with(series::media::fetch(vec![])))
		.exec()
		.await?;

	if lib.is_none() {
		return Err(ApiError::NotFound(format!(
			"Library with id {} not found",
			id
		)));
	}

	Ok(Json(lib.unwrap()))
}

#[get("/libraries/<id>/thumbnail")]
pub async fn get_library_thumbnail(
	id: String,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<ImageResponse> {
	let db = ctx.get_db();

	// let library = db
	// 	.library()
	// 	.find_unique(library::id::equals(id.clone()))
	// 	.with(library::series::fetch(vec![]).with(series::media::fetch(vec![])))
	// 	.exec()
	// 	.await?;

	let library_series = db
		.series()
		.find_many(vec![series::library_id::equals(Some(id.clone()))])
		.with(series::media::fetch(vec![]).order_by(media::name::order(Direction::Asc)))
		.exec()
		.await?;

	// TODO: error handling

	let series = library_series.first().unwrap();

	let media = series.media()?.first().unwrap();

	// if library.is_none() {
	// 	return Err(ApiError::NotFound(format!(
	// 		"Library with id {} not found",
	// 		id
	// 	)));
	// }

	// let library = library.unwrap();

	Ok(fs::media_file::get_page(media.path.as_str(), 1)?)
}

// TODO: write me
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

#[derive(Deserialize)]
pub struct CreateLibrary {
	name: String,
	path: String,
	description: Option<String>,
}

/// Create a new library. Will queue a ScannerJob to scan the library, and return the library
#[post("/libraries", data = "<input>")]
pub async fn create_library(
	input: Json<CreateLibrary>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<library::Data>> {
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

	Ok(Json(lib))
}

#[derive(Deserialize)]
pub struct UpdateLibrary {
	name: String,
	path: String,
	description: Option<String>,
}

/// Update a library.
// TODO: Scan?
#[put("/libraries/<id>", data = "<input>")]
pub async fn update_library(
	id: String,
	input: Json<UpdateLibrary>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<library::Data>> {
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

	Ok(Json(updated.unwrap()))
}

// TODO: check the deletion of a library properly cascades to all series and media within it.
#[delete("/libraries/<id>")]
pub async fn delete_library(
	id: String,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<library::Data>> {
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

	Ok(Json(deleted.unwrap()))
}
