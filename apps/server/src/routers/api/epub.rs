use std::path::PathBuf;

use axum::{
	extract::Path, middleware::from_extractor, routing::get, Extension, Json, Router,
};
use axum_sessions::extractors::ReadableSession;
use stump_core::{
	fs::epub,
	prisma::{media, read_progress},
	types::Epub,
};

use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{get_session_user, http::BufferResponse},
};

pub(crate) fn mount() -> Router {
	Router::new()
		.nest(
			"/epub/:id",
			Router::new()
				.route("/", get(get_epub))
				.route("/chapter/:chapter", get(get_epub_chapter))
				.route("/:root/:resource", get(get_epub_meta)),
		)
		.layer(from_extractor::<Auth>())
}

/// Get an Epub by ID. The `read_progress` relation is loaded.
async fn get_epub(
	Path(id): Path<String>,
	Extension(ctx): State,
	session: ReadableSession,
) -> ApiResult<Json<Epub>> {
	let user_id = get_session_user(&session)?.id;

	let book = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id),
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
async fn get_epub_chapter(
	Path(id): Path<String>,
	Path(chapter): Path<usize>,
	Extension(ctx): State,
) -> ApiResult<BufferResponse> {
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

	Ok(epub::get_epub_chapter(book.path.as_str(), chapter)?.into())
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
async fn get_epub_meta(
	Path(id): Path<String>,
	Path(root): Path<String>,
	// TODO: does this work?
	Path(resource): Path<PathBuf>,
	Extension(ctx): State,
) -> ApiResult<BufferResponse> {
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
		)?
		.into());
	}

	// when a resource is loaded from a path, it is likely something inside the contents of an epub page,
	// such as a css file or an image file.
	Ok(
		epub::get_epub_resource_from_path(book.path.as_str(), root.as_str(), resource)?
			.into(),
	)
}
