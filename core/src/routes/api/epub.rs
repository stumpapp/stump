use std::path::PathBuf;

use rocket::{http::ContentType, serde::json::Json};
use rocket_okapi::openapi;

use crate::{
	fs::epub,
	guards::auth::Auth,
	prisma::{media, read_progress},
	types::{
		alias::{ApiResult, Ctx},
		errors::ApiError,
		models::epub::Epub,
	},
};

/// Get an Epub by ID. The `read_progress` relation is loaded.
#[openapi(tag = "Epub Media")]
#[get("/epub/<id>")]
pub async fn get_epub(id: String, ctx: &Ctx, auth: Auth) -> ApiResult<Json<Epub>> {
	let book = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(auth.0.id),
		]))
		.exec()
		.await?;

	if book.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let book = book.unwrap();

	Ok(Json(Epub::try_from(book)?))
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
#[openapi(tag = "Epub Media")]
#[get("/epub/<id>/chapter/<chapter>", rank = 3)]
pub async fn get_epub_chatper(
	id: String,
	chapter: usize,
	ctx: &Ctx,
	// auth: Auth,
) -> ApiResult<(ContentType, Vec<u8>)> {
	let book = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if book.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let book = book.unwrap();

	Ok(epub::get_epub_chapter(book.path.as_str(), chapter)?)
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
#[openapi(tag = "Epub Media")]
#[get("/epub/<id>/<root>/<resource..>", rank = 4)]
pub async fn get_epub_meta(
	id: String,
	root: String,
	resource: PathBuf,
	ctx: &Ctx,
	// auth: Auth,
) -> ApiResult<(ContentType, Vec<u8>)> {
	let book = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if book.is_none() {
		return Err(ApiError::NotFound(format!(
			"Media with id {} not found",
			id
		)));
	}

	let book = book.unwrap();

	// reserved for accessing resources via resource id
	if root == "META-INF" {
		return Ok(epub::get_epub_resource(
			book.path.as_str(),
			resource.to_str().unwrap(),
		)?);
	}

	// when a resource is loaded from a path, it is likely something inside the contents of an epub page,
	// such as a css file or an image file.
	Ok(epub::get_epub_resource_from_path(
		book.path.as_str(),
		root.as_str(),
		resource,
	)?)
}
