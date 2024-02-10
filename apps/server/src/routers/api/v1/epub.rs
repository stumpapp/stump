use std::path::PathBuf;

use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, put},
	Json, Router,
};
use prisma_client_rust::chrono::Utc;
use serde::Deserialize;
use specta::Type;
use stump_core::{
	db::entity::{Bookmark, Epub, ReadProgress, UpdateEpubProgress},
	filesystem::media::EpubProcessor,
	prisma::{bookmark, media, media_annotation, read_progress, user},
};
use tower_sessions::Session;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
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
				.route(
					"/bookmarks",
					get(get_bookmarks)
						.post(create_or_update_bookmark)
						.delete(delete_bookmark),
				)
				.route("/chapter/:chapter", get(get_epub_chapter))
				.route("/:root/:resource", get(get_epub_meta)),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

/// Get an Epub by ID. The `read_progress` relation is loaded.
async fn get_epub_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Epub>> {
	let user_id = get_session_user(&session)?.id;

	let result = ctx
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

	if let Some(book) = result {
		Ok(Json(Epub::try_from(book)?))
	} else {
		Err(APIError::NotFound(format!(
			"Media with id {} not found",
			id
		)))
	}
}

/// Update the progress of an epub. This is separate from media progress updates
/// since there is enough epub-specific data that needs to be updated that would
/// convolute the media progress update.
async fn update_epub_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<UpdateEpubProgress>,
) -> APIResult<Json<ReadProgress>> {
	let db = &ctx.db;
	let user_id = get_session_user(&session)?.id;

	let input_is_complete = input.is_complete.unwrap_or(input.percentage >= 1.0);
	let input_completed_at = input_is_complete.then(|| Utc::now().into());

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

async fn get_bookmarks(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
) -> APIResult<Json<Vec<Bookmark>>> {
	let client = &ctx.db;

	let user = get_session_user(&session)?;

	let bookmarks = client
		.bookmark()
		.find_many(vec![
			bookmark::user_id::equals(user.id),
			bookmark::media_id::equals(id),
		])
		.exec()
		.await?;

	Ok(Json(
		bookmarks
			.into_iter()
			.map(Bookmark::from)
			.collect::<Vec<Bookmark>>(),
	))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct CreateOrUpdateBookmark {
	/// The position of the bookmark in the epub, represented by an epubcfi
	epubcfi: String,
	/// Optional text content at the start of the epubcfi range. This is used to display a preview
	/// of the bookmark in the UI
	preview_content: Option<String>,
}

async fn create_or_update_bookmark(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<CreateOrUpdateBookmark>,
) -> APIResult<Json<Bookmark>> {
	let client = &ctx.db;

	let user = get_session_user(&session)?;

	let bookmark = client
		.bookmark()
		.upsert(
			bookmark::user_id_media_id_epubcfi_page(
				user.id.clone(),
				id.clone(),
				input.epubcfi.clone(),
				-1,
			),
			(
				media::id::equals(id),
				user::id::equals(user.id),
				vec![
					bookmark::epubcfi::set(Some(input.epubcfi.clone())),
					bookmark::preview_content::set(input.preview_content.clone()),
					bookmark::page::set(Some(-1)),
				],
			),
			vec![
				bookmark::epubcfi::set(Some(input.epubcfi)),
				bookmark::preview_content::set(input.preview_content),
				bookmark::page::set(Some(-1)),
			],
		)
		.exec()
		.await?;

	Ok(Json(Bookmark::from(bookmark)))
}

#[derive(Deserialize, Type, ToSchema)]
pub struct DeleteBookmark {
	/// The position of the bookmark in the epub, represented by an epubcfi
	epubcfi: String,
}

async fn delete_bookmark(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: Session,
	Json(input): Json<DeleteBookmark>,
) -> APIResult<Json<Bookmark>> {
	let client = &ctx.db;

	let user = get_session_user(&session)?;

	let bookmark = client
		.bookmark()
		.delete(bookmark::user_id_media_id_epubcfi_page(
			user.id,
			id,
			input.epubcfi,
			-1,
		))
		.exec()
		.await?;

	Ok(Json(Bookmark::from(bookmark)))
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
async fn get_epub_chapter(
	Path((id, chapter)): Path<(String, usize)>,
	State(ctx): State<AppState>,
) -> APIResult<BufferResponse> {
	let result = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if let Some(book) = result {
		Ok(EpubProcessor::get_chapter(book.path.as_str(), chapter)?.into())
	} else {
		Err(APIError::NotFound(format!(
			"Media with id {} not found",
			id
		)))
	}
}

/// Get a resource from an epub file. META-INF is a reserved `root` query parameter, which will
/// grab a resource by resource ID (e.g. `META-INF/container.xml`, where `container.xml` is the
/// resource ID). Otherwise, the `resource` query parameter represents the path to the requested
/// resource. (e.g. `/EPUB/chapter1.xhtml`, where `EPUB` is the root and `chapter1.xhtml` is
/// the resource path)
async fn get_epub_meta(
	Path((id, root, resource)): Path<(String, String, PathBuf)>,
	State(ctx): State<AppState>,
) -> APIResult<BufferResponse> {
	let result = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.exec()
		.await?;

	if let Some(book) = result {
		let (content_type, buffer) = if root == "META-INF" {
			// reserved for accessing resources via resource id
			EpubProcessor::get_resource_by_id(
				book.path.as_str(),
				resource.to_str().unwrap_or_default(),
			)?
		} else {
			// NOTE: when a resource is loaded from a path, it is likely something inside the contents of an epub page,
			// such as a css file or an image file.
			EpubProcessor::get_resource_by_path(
				book.path.as_str(),
				root.as_str(),
				resource,
			)?
		};

		Ok(BufferResponse::new(content_type, buffer))
	} else {
		Err(APIError::NotFound(format!(
			"Media with id {} not found",
			id
		)))
	}
}
