use std::path::PathBuf;

use axum::{
	extract::{Path, State},
	middleware,
	routing::{get, put},
	Extension, Json, Router,
};
use serde::Deserialize;
use specta::Type;
use stump_core::{
	db::entity::{
		ActiveReadingSession, Bookmark, Epub, FinishedReadingSession,
		ProgressUpdateReturn, UpdateEpubProgress,
	},
	filesystem::media::EpubProcessor,
	prisma::{
		active_reading_session, bookmark, finished_reading_session, media,
		media_annotation, user,
	},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, AuthContext},
	utils::http::BufferResponse,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/epub/{id}",
			Router::new()
				.route("/", get(get_epub_by_id))
				.route("/progress", put(update_epub_progress))
				.route(
					"/bookmarks",
					get(get_bookmarks)
						.post(create_or_update_bookmark)
						.delete(delete_bookmark),
				)
				.route("/chapter/{chapter}", get(get_epub_chapter))
				.route("/{root}/{resource}", get(get_epub_meta)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// Get an Epub by ID
async fn get_epub_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Epub>> {
	let user_id = req.id();

	let result = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::active_user_reading_sessions::fetch(vec![
			active_reading_session::user_id::equals(user_id.clone()),
		]))
		.with(media::finished_user_reading_sessions::fetch(vec![
			finished_reading_session::user_id::equals(user_id.clone()),
		]))
		.with(media::annotations::fetch(vec![
			media_annotation::user_id::equals(user_id),
		]))
		.exec()
		.await?;

	if let Some(book) = result {
		Ok(Json(Epub::try_from(book)?))
	} else {
		Err(APIError::NotFound(format!("Media with id {id} not found")))
	}
}

/// Update the progress of an epub. This is separate from media progress updates
/// since there is enough epub-specific data that needs to be updated that would
/// convolute the media progress update.
async fn update_epub_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<UpdateEpubProgress>,
) -> APIResult<Json<ProgressUpdateReturn>> {
	let client = &ctx.db;
	let user_id = req.id();

	let is_complete = input.is_complete.unwrap_or(input.percentage >= 1.0);

	if is_complete {
		let finished_session = client
			._transaction()
			.run(|tx| async move {
				let deleted_session = tx
					.active_reading_session()
					.delete(active_reading_session::user_id_media_id(
						user_id.clone(),
						id.clone(),
					))
					.exec()
					.await
					.ok();
				tracing::trace!(?deleted_session, "Deleted active reading session");

				tx.finished_reading_session()
					.create(
						deleted_session.map(|s| s.started_at).unwrap_or_default(),
						media::id::equals(id.clone()),
						user::id::equals(user_id.clone()),
						vec![],
					)
					.exec()
					.await
			})
			.await?;
		tracing::trace!(?finished_session, "Created finished reading session");

		Ok(Json(ProgressUpdateReturn::Finished(
			FinishedReadingSession::from(finished_session),
		)))
	} else {
		let active_session = client
			.active_reading_session()
			.upsert(
				active_reading_session::user_id_media_id(user_id.clone(), id.clone()),
				(
					media::id::equals(id.clone()),
					user::id::equals(user_id.clone()),
					vec![
						active_reading_session::epubcfi::set(Some(input.epubcfi.clone())),
						active_reading_session::percentage_completed::set(Some(
							input.percentage,
						)),
					],
				),
				vec![
					active_reading_session::epubcfi::set(Some(input.epubcfi)),
					active_reading_session::percentage_completed::set(Some(
						input.percentage,
					)),
				],
			)
			.exec()
			.await?;

		Ok(Json(ProgressUpdateReturn::Active(
			ActiveReadingSession::from(active_session),
		)))
	}
}

async fn get_bookmarks(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<Bookmark>>> {
	let client = &ctx.db;

	let user = req.user();

	let bookmarks = client
		.bookmark()
		.find_many(vec![
			bookmark::user_id::equals(user.id.clone()),
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

#[derive(Deserialize, Type)]
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
	Extension(req): Extension<AuthContext>,
	Json(input): Json<CreateOrUpdateBookmark>,
) -> APIResult<Json<Bookmark>> {
	let client = &ctx.db;

	let user = req.user();

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
				user::id::equals(user.id.clone()),
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

#[derive(Deserialize, Type)]
pub struct DeleteBookmark {
	/// The position of the bookmark in the epub, represented by an epubcfi
	epubcfi: String,
}

async fn delete_bookmark(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(input): Json<DeleteBookmark>,
) -> APIResult<Json<Bookmark>> {
	let client = &ctx.db;

	let user = req.user();

	let bookmark = client
		.bookmark()
		.delete(bookmark::user_id_media_id_epubcfi_page(
			user.id.clone(),
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
		Err(APIError::NotFound(format!("Media with id {id} not found")))
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
		Err(APIError::NotFound(format!("Media with id {id} not found")))
	}
}
