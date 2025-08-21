use std::{path::PathBuf, sync::Arc};

use axum::{
	extract::{Path, Query, State},
	Extension, Json,
};
use models::shared::image_processor_options::ScaledDimensionResize;
use prisma_client_rust::{chrono::Duration, Direction};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;
use specta::Type;
use stump_core::{
	db::entity::{
		macros::{
			finished_reading_session_with_book_pages, media_id_select,
			reading_session_with_book_pages,
		},
		ActiveReadingSession, FinishedReadingSession, Media, MediaMetadata,
		PageDimension, PageDimensionsEntity, ProgressUpdateReturn, User, UserPermission,
	},
	filesystem::{
		image::resize_image,
		media::{analyze_media_job::AnalyzeMediaJob, get_page_async},
	},
	prisma::{
		active_reading_session, finished_reading_session, library,
		media::{self, WhereParam},
		media_metadata, series, user,
	},
	Ctx,
};
use tracing::error;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::AuthContext,
	routers::api::filters::{
		apply_media_age_restriction, apply_media_library_not_hidden_for_user_filter,
	},
	utils::http::{ImageResponse, NamedFile},
};

/// Represents the relations to load for a book entity, including optional loading
/// of the series and library relationships.
#[derive(Deserialize, Type)]
pub(crate) struct BookRelations {
	#[serde(default)]
	load_series: Option<bool>,
	#[serde(default)]
	load_library: Option<bool>,
	#[serde(default)]
	load_pages: Option<bool>,
}

/// Represents whether a media item is marked as completed and the last time it was completed.
#[derive(Default, Deserialize, Serialize, ToSchema, specta::Type)]
pub(crate) struct MediaIsComplete {
	is_completed: bool,
	last_completed_at: Option<String>,
}

/// Represents an update to the completion status of a media item.
#[derive(Deserialize, ToSchema, specta::Type)]
pub(crate) struct PutMediaCompletionStatus {
	is_complete: bool,
	#[specta(optional)]
	page: Option<i32>,
}

#[utoipa::path(
	get,
	path = "/api/v1/media/path/{path}",
	tag = "media",
	params(
		("path" = String, Path, description = "The path of the media to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media", body = Media),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
pub async fn get_media_by_path(
	Path(path): Path<PathBuf>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Media>> {
	let client = &ctx.db;

	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let path_str = path.to_string_lossy().to_string();
	let required_params = [media::path::equals(path_str.clone())]
		.into_iter()
		.chain(apply_media_library_not_hidden_for_user_filter(user))
		.collect::<Vec<WhereParam>>();

	let book = client
		.media()
		.find_first(chain_optional_iter(required_params, [age_restrictions]))
		.with(media::metadata::fetch())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	Ok(Json(Media::from(book)))
}

#[utoipa::path(
	get,
	path = "/api/v1/media/{id}",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get"),
		("load_series" = Option<bool>, Query, description = "Whether to load the series relation for the media")
	),
	responses(
		(status = 200, description = "Successfully fetched media", body = Media),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get a media by its ID. If provided, the `load_series` query param will load
/// the series relation for the media.
pub async fn get_media_by_id(
	Path(id): Path<String>,
	params: Query<BookRelations>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Media>> {
	let db = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let mut query = db
		.media()
		.find_first(where_params)
		.with(media::active_user_reading_sessions::fetch(vec![
			active_reading_session::user_id::equals(user_id.clone()),
		]))
		.with(media::finished_user_reading_sessions::fetch(vec![
			finished_reading_session::user_id::equals(user_id),
		]));

	if params.load_pages.unwrap_or_default() {
		query = query.with(
			media::metadata::fetch().with(media_metadata::page_dimensions::fetch()),
		);
	} else {
		query = query.with(media::metadata::fetch());
	}

	if params.load_series.unwrap_or_default() {
		tracing::trace!(media_id = id, "Loading series relation for media");
		query = query.with(if params.load_library.unwrap_or_default() {
			media::series::fetch()
				.with(series::metadata::fetch())
				.with(series::library::fetch().with(library::config::fetch()))
		} else {
			media::series::fetch().with(series::metadata::fetch())
		});
	}

	let media = query
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	Ok(Json(Media::from(media)))
}

// TODO: type a body
#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/file",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully fetched media file"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Download the file associated with the media.
pub(crate) async fn get_media_file(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<NamedFile> {
	let db = &ctx.db;

	let user = req.user_and_enforce_permissions(&[UserPermission::DownloadFile])?;
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_conditions = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(&user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let media = db
		.media()
		.find_first(where_conditions)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	tracing::trace!(?media, "Downloading media file");

	Ok(NamedFile::open(media.path.clone()).await?)
}

#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/convert",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media")
	),
	responses(
		(status = 200, description = "Successfully converted media"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
// TODO: remove this, implement it? maybe?
/// Converts a media file to a different format. Currently UNIMPLEMENTED.
pub(crate) async fn convert_media(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> Result<(), APIError> {
	let db = &ctx.db;

	// TODO: if keeping, enforce permission
	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let media = db
		.media()
		.find_first(where_params)
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	if media.extension != "cbr" || media.extension != "rar" {
		return Err(APIError::BadRequest(String::from(
			"Stump only supports RAR to ZIP conversions at this time",
		)));
	}

	Err(APIError::NotImplemented)
}

/// Extra query params for scaling a page dimension according to a specific dimension.
/// This means the opposite dimension will be calculated based on the aspect ratio
#[derive(Default, Debug, Deserialize, Serialize, ToSchema)]
pub struct RequestPageScaled {
	#[serde(default)]
	height: Option<u32>,
	#[serde(default)]
	width: Option<u32>,
}

impl RequestPageScaled {
	pub fn to_scaled_dimension(&self) -> Option<ScaledDimensionResize> {
		match (self.height, self.width) {
			(Some(height), _) => Some(ScaledDimensionResize::Height(height)),
			(_, Some(width)) => Some(ScaledDimensionResize::Width(width)),
			_ => None,
		}
	}
}

#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/page/{page}",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get"),
		("page" = i32, Path, description = "The page to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get a page of a media
pub(crate) async fn get_media_page(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Query(requested_scale): Query<RequestPageScaled>,
) -> APIResult<ImageResponse> {
	let db = &ctx.db;

	tracing::trace!(?id, ?page, ?requested_scale, "Fetching media page");

	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let media = db
		.media()
		.find_first(where_params)
		.with(media::active_user_reading_sessions::fetch(vec![
			active_reading_session::user_id::equals(user_id),
		]))
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	if page > media.pages {
		Err(APIError::BadRequest(format!(
			"Page {page} is out of bounds for media {id}"
		)))
	} else {
		let (content_type, buf) = get_page_async(&media.path, page, &ctx.config).await?;
		let scaled_buf = match requested_scale.to_scaled_dimension() {
			Some(dimension) => resize_image(buf, dimension).await?,
			_ => buf,
		};
		Ok(ImageResponse {
			content_type,
			data: scaled_buf,
		})
	}
}

#[skip_serializing_none]
#[derive(Deserialize, Serialize, ToSchema, specta::Type)]
pub struct PutMediaProgress {
	pub page: i32,
	pub epubcfi: Option<String>,
	pub elapsed_seconds: Option<i64>,
}

#[utoipa::path(
	put,
	path = "/api/v1/media/{id}/progress",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get"),
	),
	responses(
		(status = 200, description = "Successfully fetched media read progress"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Update the read progress of a media. If the progress doesn't exist, it will be created.
pub(crate) async fn update_media_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(PutMediaProgress {
		page,
		epubcfi,
		elapsed_seconds,
	}): Json<PutMediaProgress>,
) -> APIResult<Json<ProgressUpdateReturn>> {
	let user = req.user();
	let user_id = user.id.clone();

	let client = &ctx.db;
	// TODO: check library access? They don't gain access to the book here, so perhaps
	// it is acceptable to not check library access here?

	let active_session = client
		.active_reading_session()
		.upsert(
			active_reading_session::user_id_media_id(user_id.clone(), id.clone()),
			(
				media::id::equals(id.clone()),
				user::id::equals(user_id.clone()),
				chain_optional_iter(
					[active_reading_session::page::set(Some(page))],
					[
						epubcfi
							.clone()
							.map(|cfi| active_reading_session::epubcfi::set(Some(cfi))),
						elapsed_seconds.map(|es| {
							active_reading_session::elapsed_seconds::set(Some(es))
						}),
					],
				),
			),
			chain_optional_iter(
				[active_reading_session::page::set(Some(page))],
				[
					epubcfi.map(|cfi| active_reading_session::epubcfi::set(Some(cfi))),
					elapsed_seconds
						.map(|es| active_reading_session::elapsed_seconds::set(Some(es))),
				],
			),
		)
		.include(reading_session_with_book_pages::include())
		.exec()
		.await?;
	let is_completed = active_session.media.pages == page;

	if is_completed {
		let timeout = Duration::seconds(10).num_milliseconds() as u64;
		let finished_session = client
			._transaction()
			.with_max_wait(timeout)
			.with_timeout(timeout)
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
						chain_optional_iter(
							[],
							[elapsed_seconds.map(|es| {
								finished_reading_session::elapsed_seconds::set(Some(es))
							})],
						),
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
		Ok(Json(ProgressUpdateReturn::Active(
			ActiveReadingSession::from(active_session),
		)))
	}
}

#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/progress",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media read progress"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn get_media_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Option<ActiveReadingSession>>> {
	let db = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let media_where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let result = db
		.active_reading_session()
		.find_first(vec![
			active_reading_session::user_id::equals(user_id.clone()),
			active_reading_session::media_id::equals(id.clone()),
			active_reading_session::media::is(media_where_params),
		])
		.exec()
		.await?;

	Ok(Json(result.map(ActiveReadingSession::from)))
}

// TODO: new API for managing finished sessions

#[utoipa::path(
	delete,
	path = "/api/v1/media/{id}/progress",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media delete the progress for")
	),
	responses(
		(status = 200, description = "Successfully updated media read progress completion status"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn delete_media_progress(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<MediaIsComplete>> {
	let client = &ctx.db;
	let user_id = req.id();

	let deleted_session = client
		.active_reading_session()
		.delete(active_reading_session::user_id_media_id(user_id, id))
		.exec()
		.await?;

	tracing::trace!(?deleted_session, "Deleted reading session");

	Ok(Json(MediaIsComplete::default()))
}

#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/progress/complete",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get")
	),
	responses(
		(status = 200, description = "Successfully fetched media read progress completion status"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn get_is_media_completed(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<MediaIsComplete>> {
	let client = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let media_where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let result = client
		.finished_reading_session()
		.find_first(vec![
			finished_reading_session::user_id::equals(user_id.clone()),
			finished_reading_session::media_id::equals(id.clone()),
			finished_reading_session::media::is(media_where_params),
		])
		.order_by(finished_reading_session::completed_at::order(
			Direction::Desc,
		))
		.include(finished_reading_session_with_book_pages::include())
		.exec()
		.await?
		.map(|ars| MediaIsComplete {
			is_completed: true,
			last_completed_at: Some(ars.completed_at.to_rfc3339()),
		})
		.unwrap_or_default();

	Ok(Json(result))
}

#[utoipa::path(
	put,
	path = "/api/v1/media/{id}/progress/complete",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to mark as completed")
	),
	responses(
		(status = 200, description = "Successfully updated media read progress completion status"),
		(status = 401, description = "Unauthorized"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn put_media_complete_status(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(payload): Json<PutMediaCompletionStatus>,
) -> APIResult<Json<MediaIsComplete>> {
	let client = &ctx.db;
	let user = req.user();
	let user_id = user.id.clone();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let media_where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let book = client
		.media()
		.find_first(media_where_params.clone())
		.with(media::metadata::fetch())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	let extension = book.extension.to_lowercase();

	let is_completed = payload.is_complete;

	if is_completed {
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

		Ok(Json(MediaIsComplete {
			is_completed: true,
			last_completed_at: Some(finished_session.completed_at.to_rfc3339()),
		}))
	} else {
		let page = match extension.as_str() {
			"epub" => -1,
			_ => payload.page.unwrap_or(book.pages),
		};
		let updated_or_created_session = client
			.active_reading_session()
			.upsert(
				active_reading_session::user_id_media_id(user_id.clone(), id.clone()),
				(
					media::id::equals(id.clone()),
					user::id::equals(user_id.clone()),
					vec![active_reading_session::page::set(Some(page))],
				),
				vec![active_reading_session::page::set(Some(page))],
			)
			.exec()
			.await?;
		tracing::trace!(
			?updated_or_created_session,
			"Updated or created active reading session"
		);

		Ok(Json(MediaIsComplete::default()))
	}
}

#[utoipa::path(
	post,
	path = "/api/v1/media/{id}/analyze",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to analyze")
	),
	responses(
		(status = 200, description = "Successfully started media analysis"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media not found"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn start_media_analysis(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<()> {
	req.enforce_permissions(&[UserPermission::ManageLibrary])?;

	// Start analysis job
	ctx.enqueue_job(AnalyzeMediaJob::analyze_media_item(id))
		.map_err(|e| {
			let err = "Failed to enqueue analyze media job";
			error!(?e, err);
			APIError::InternalServerError(err.to_string())
		})?;

	APIResult::Ok(())
}

#[utoipa::path(
	post,
	path = "/api/v1/media/{id}/dimensions",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get dimensions for")
	),
	responses(
		(status = 200, description = "Successfully fetched media dimensions"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media dimensions not available"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn get_media_dimensions(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<PageDimension>>> {
	// Fetch the media item in question from the database while enforcing permissions
	let dimensions_entity =
		fetch_media_page_dimensions_with_permissions(&ctx, req.user(), id).await?;

	Ok(Json(dimensions_entity.dimensions))
}

#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/page/{page}/dimensions",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get dimensions for"),
		("page" = i32, Path, description = "The page to get dimensions for (indexed from 1)")
	),
	responses(
		(status = 200, description = "Successfully fetched media page dimensions"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media dimensions not available"),
		(status = 500, description = "Internal server error"),
	)
)]
pub(crate) async fn get_media_page_dimensions(
	Path((id, page)): Path<(String, i32)>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<PageDimension>> {
	// Fetch the media item in question from the database while enforcing permissions
	let dimensions_entity =
		fetch_media_page_dimensions_with_permissions(&ctx, req.user(), id).await?;

	if page <= 0 {
		return Err(APIError::BadRequest(format!(
			"Cannot fetch page dimensions for page {page}, expected a number > 0"
		)));
	}

	// Get the specific page or 404
	let page_dimension = dimensions_entity
		.dimensions
		.get((page - 1) as usize)
		.ok_or(APIError::NotFound(format!(
			"No page dimensions for page: {page}"
		)))?;

	Ok(Json(page_dimension.to_owned()))
}

async fn fetch_media_page_dimensions_with_permissions(
	ctx: &Arc<Ctx>,
	user: &User,
	id: String,
) -> APIResult<PageDimensionsEntity> {
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));

	// Build where parameters to fetch the appropriate media
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	// Get the media from the database
	let media: Media = ctx
		.db
		.media()
		.find_first(where_params)
		.with(media::metadata::fetch().with(media_metadata::page_dimensions::fetch()))
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?
		.into();

	// Then pull off the page dimensions if available
	let dimensions_entity = media
		.metadata
		.ok_or(APIError::NotFound(
			"Media did not have metadata".to_string(),
		))?
		.page_dimensions
		.ok_or(APIError::NotFound(
			"Media metadata does not have generated page dimensions. Run analysis to generate them.".to_string(),
		))?;

	Ok(dimensions_entity)
}

#[utoipa::path(
	get,
	path = "/api/v1/media/{id}/metadata",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to get metadata for")
	),
	responses(
		(status = 200, description = "Successfully fetched media metadata"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media metadata not available"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Get the metadata for a media record
pub(crate) async fn get_media_metadata(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Option<MediaMetadata>>> {
	let db = &ctx.db;
	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let meta = db
		.media_metadata()
		.find_first(vec![media_metadata::media::is(where_params)])
		.exec()
		.await?;

	Ok(Json(meta.map(MediaMetadata::from)))
}

#[utoipa::path(
	put,
	path = "/api/v1/media/{id}/metadata",
	tag = "media",
	params(
		("id" = String, Path, description = "The ID of the media to update metadata for")
	),
	responses(
		(status = 200, description = "Successfully updated media metadata"),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 404, description = "Media metadata not available"),
		(status = 500, description = "Internal server error"),
	)
)]
/// Update the metadata for a media record. This is a full update, so any existing metadata
/// will be replaced with the new metadata.
pub(crate) async fn put_media_metadata(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(metadata): Json<MediaMetadata>,
) -> APIResult<Json<MediaMetadata>> {
	req.enforce_permissions(&[UserPermission::ManageLibrary])?;

	let db = &ctx.db;
	let user = req.user();
	let age_restrictions = user
		.age_restriction
		.as_ref()
		.map(|ar| apply_media_age_restriction(ar.age, ar.restrict_on_unset));
	let where_params = chain_optional_iter(
		[media::id::equals(id.clone())]
			.into_iter()
			.chain(apply_media_library_not_hidden_for_user_filter(user))
			.collect::<Vec<WhereParam>>(),
		[age_restrictions],
	);

	let book = db
		.media()
		.find_first(where_params.clone())
		.select(media_id_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Media not found")))?;

	let set_params = metadata.into_prisma();

	let meta = db
		.media_metadata()
		.upsert(
			media_metadata::media_id::equals(id.clone()),
			set_params
				.clone()
				.into_iter()
				.chain(vec![media_metadata::media::connect(media::id::equals(
					book.id.clone(),
				))])
				.collect::<Vec<_>>(),
			set_params.clone(),
		)
		.exec()
		.await?;

	Ok(Json(MediaMetadata::from(meta)))
}
