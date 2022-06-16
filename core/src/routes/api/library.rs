use std::path::Path;

use prisma_client_rust::Direction;
use rocket::serde::json::Json;
use rocket_okapi::{openapi, JsonSchema};
use serde::Deserialize;

use crate::{
	fs::{self},
	guards::auth::{AdminGuard, Auth},
	job::library::LibraryScannerJob,
	prisma::{library, media, series, tag},
	types::{
		alias::{ApiResult, Context},
		errors::ApiError,
		http::ImageResponse,
		models::{library::Library, tag::Tag},
		pageable::{Pageable, PagedRequestParams},
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
	// _auth: Auth,
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

	Ok(fs::media_file::get_page(media.path.as_str(), 1)?)
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

	let job = LibraryScannerJob {
		path: lib.path.clone(),
	};

	ctx.spawn_job(Box::new(job));

	Ok(())
}

#[derive(Deserialize, JsonSchema)]
pub struct CreateLibrary {
	/// The name of the library to create.
	name: String,
	/// The path to the library to create, i.e. where the directory is on the filesystem.
	path: String,
	/// Optional text description of the library.
	description: Option<String>,
	/// Optional tags to assign to the library.
	tags: Option<Vec<Tag>>,
	/// Optional flag to indicate if the library should be automatically scanned after creation. Default is `true`.
	scan: Option<bool>,
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

	// TODO: check library is not a parent of another library
	if !Path::new(&input.path).exists() {
		return Err(ApiError::BadRequest(format!(
			"The library directory does not exist: {}",
			input.path
		)));
	}

	let lib = db
		.library()
		.create(
			library::name::set(input.name.to_owned()),
			library::path::set(input.path.to_owned()),
			vec![library::description::set(input.description.to_owned())],
		)
		.exec()
		.await?;

	// FIXME: this is disgusting. I don't understand why the library::tag::link doesn't
	// work with multiple tags, nor why providing multiple library::tag::link params
	// doesn't work. Regardless, absolutely do NOT keep this. Correction required,
	// highly inefficient queries.
	if let Some(tags) = input.tags.to_owned() {
		for tag in tags {
			db.library()
				.find_unique(library::id::equals(lib.id.clone()))
				.update(vec![library::tags::link(vec![tag::id::equals(
					tag.id.to_owned(),
				)])])
				.exec()
				.await?;
		}
	}

	// `scan` is not a required field, however it will default to true if not provided
	if input.scan.unwrap_or(true) {
		ctx.spawn_job(Box::new(LibraryScannerJob {
			path: lib.path.clone(),
		}));
	}

	Ok(Json(lib.into()))
}

#[derive(Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLibrary {
	/// The updated name of the library.
	name: String,
	/// The updated path of the library.
	path: String,
	/// The updated description of the library.
	description: Option<String>,
	/// The updated tags of the library.
	tags: Option<Vec<Tag>>,
	/// The tags to remove from the library.
	removed_tags: Option<Vec<Tag>>,
	/// Optional flag to indicate if the library should be automatically scanned after update. Default is `true`.
	scan: Option<bool>,
}

/// Update a library by id, if the current user is a SERVER_OWNER.
// TODO: Scan?
#[openapi(tag = "Library")]
#[put("/libraries/<id>", data = "<input>")]
pub async fn update_library(
	id: String,
	input: Json<UpdateLibrary>,
	ctx: &Context,
	_auth: AdminGuard,
) -> ApiResult<Json<Library>> {
	let db = ctx.get_db();

	if !Path::new(&input.path).exists() {
		return Err(ApiError::BadRequest(format!(
			"The requested change would result in a non-existent library path: {}",
			input.path
		)));
	}

	let updates: Vec<library::SetParam> = vec![
		library::name::set(input.name.to_owned()),
		library::path::set(input.path.to_owned()),
		library::description::set(input.description.to_owned()),
	];

	// FIXME: this is disgusting. I don't understand why the library::tag::link doesn't
	// work with multiple tags, nor why providing multiple library::tag::link params
	// doesn't work. Regardless, absolutely do NOT keep this. Correction required,
	// highly inefficient queries.

	if let Some(tags) = input.tags.to_owned() {
		if tags.len() > 0 {
			// updates.push(library::tags::link(vec![
			// 	tag::name::equals(String::from("Demo")),
			// 	tag::name::equals(String::from("Dem2")),
			// ]));

			for tag in tags {
				db.library()
					.find_unique(library::id::equals(id.clone()))
					.update(vec![library::tags::link(vec![tag::id::equals(
						tag.id.to_owned(),
					)])])
					.exec()
					.await?;
			}
		}
	}

	if let Some(removed_tags) = input.removed_tags.to_owned() {
		if removed_tags.len() > 0 {
			// updates.push(library::tags::link(vec![
			// 	tag::name::equals(String::from("Demo")),
			// 	tag::name::equals(String::from("Dem2")),
			// ]));

			// let mut removing = removed_tags
			// 	.into_iter()
			// 	.map(|t| {
			// 		println!("unlink tag: {:?}", t);
			// 		library::tags::unlink(vec![tag::UniqueWhereParam::IdEquals(
			// 			t.id.to_owned(),
			// 		)])
			// 	})
			// 	.collect::<Vec<library::SetParam>>();

			// updates.push(removing);
			for tag in removed_tags {
				db.library()
					.find_unique(library::id::equals(id.clone()))
					.update(vec![library::tags::unlink(vec![tag::id::equals(
						tag.id.to_owned(),
					)])])
					.exec()
					.await?;
			}
		}
	}

	let updated = db
		.library()
		.find_unique(library::id::equals(id.clone()))
		.update(updates)
		.with(library::tags::fetch(vec![]))
		.exec()
		.await?;

	if updated.is_none() {
		return Err(ApiError::NotFound(format!(
			"Library with id {} not found",
			&id
		)));
	}

	let updated = updated.unwrap();

	// `scan` is not a required field, however it will default to true if not provided
	if input.scan.unwrap_or(true) {
		ctx.spawn_job(Box::new(LibraryScannerJob {
			path: updated.path.clone(),
		}));
	}

	Ok(Json(updated.into()))
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
