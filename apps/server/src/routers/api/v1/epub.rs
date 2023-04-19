use std::path::PathBuf;

use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, put},
	Json, Router,
};
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::chrono::Utc;
use stump_core::{
	db::models::{Epub, ReadProgress, UpdateEpubProgress},
	fs::epub,
	prisma::{media, media_annotation, read_progress, user},
};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{get_session_user, http::BufferResponse},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/epub/:id",
			Router::new()
				.route("/", get(get_epub_by_id))
				.route("/progress", put(update_epub_progress))
				.route("/chapter/:chapter", get(get_epub_chapter))
				.route("/:root/:resource", get(get_epub_meta)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

/// Get an Epub by ID. The `read_progress` relation is loaded.
async fn get_epub_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Epub>> {
	let user_id = get_session_user(&session)?.id;

	let book = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::read_progresses::fetch(vec![
			read_progress::user_id::equals(user_id.clone()),
		]))
		.with(media::annotations::fetch(vec![
			media_annotation::user_id::equals(user_id),
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

/// Update the progress of an epub. This is separate from media progress updates
/// since there is enough epub-specific data that needs to be updated that would
/// convolute the media progress update.
async fn update_epub_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
	Json(input): Json<UpdateEpubProgress>,
) -> ApiResult<Json<ReadProgress>> {
	let db = ctx.get_db();
	let user_id = get_session_user(&session)?.id;

	let input_is_complete = input.is_complete.unwrap_or(input.percentage >= 1.0);
	let input_completed_at = if input_is_complete {
		Some(Utc::now().into())
	} else {
		None
	};

	// NOTE: I am running this in a transaction with 2 queries because I don't want to update the
	// is_complete and completed_at unless a book is *newly* completed.
	// TODO: I will eventually add a way to set a book as uncompleted
	let progress = db
		._transaction()
		.run(|client| async move {
			let existing_progress = client
				.read_progress()
				.find_unique(read_progress::user_id_media_id(user_id.clone(), id.clone()))
				.exec()
				.await?;

			if let Some(progress) = existing_progress {
				let already_completed = progress.is_completed;
				let is_completed = already_completed || input_is_complete;
				let completed_at = progress.completed_at.or(input_completed_at);

				client
					.read_progress()
					.update(
						read_progress::user_id_media_id(user_id.clone(), id.clone()),
						vec![
							read_progress::epubcfi::set(Some(input.epubcfi)),
							read_progress::is_completed::set(is_completed),
							read_progress::percentage_completed::set(Some(
								input.percentage,
							)),
							read_progress::completed_at::set(completed_at),
						],
					)
					.exec()
					.await
			} else {
				client
					.read_progress()
					.create(
						-1,
						media::id::equals(id),
						user::id::equals(user_id),
						vec![
							read_progress::epubcfi::set(Some(input.epubcfi)),
							read_progress::is_completed::set(input_is_complete),
							read_progress::percentage_completed::set(Some(
								input.percentage,
							)),
							read_progress::completed_at::set(input_completed_at),
						],
					)
					.exec()
					.await
			}
		})
		.await?;

	Ok(Json(ReadProgress::from(progress)))
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
async fn get_epub_chapter(
	Path((id, chapter)): Path<(String, usize)>,
	State(ctx): State<AppState>,
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
	// TODO: does this work?
	Path((id, root, resource)): Path<(String, String, PathBuf)>,
	State(ctx): State<AppState>,
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
