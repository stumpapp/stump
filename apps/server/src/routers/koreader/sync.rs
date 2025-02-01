use axum::{
	extract::{Path, Request, State},
	middleware::{self, Next},
	response::{Json, Response},
	routing::{get, put},
	Extension, Router,
};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;
use stump_core::{
	db::entity::{
		macros::{finished_session_koreader, reading_session_koreader},
		UserPermission,
	},
	prisma::{
		active_reading_session, finished_reading_session, media,
		registered_reading_device, user,
	},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::{api_key_middleware, RequestContext},
};

#[derive(Debug, Serialize, Deserialize)]
struct KOReaderURLParams<D> {
	#[serde(flatten)]
	params: D,
	#[serde(default)]
	api_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct KOReaderDocumentURLParams {
	document: String,
}

// TODO(koreader): healthcheck? I don't think it is required, since I could configure Stump as a
// sync server just fine without it.

/// Mounts the koreader sync router at `/koreader` (from the parent router). The endpoints are
/// derived from the official koreader API.
///
/// See https://github.com/koreader/koreader-sync-server/blob/master/config/routes.lua
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/:api_key",
		Router::new()
			.route("/users/auth", get(check_authorized))
			.route("/syncs/progress", put(put_progress))
			.route("/syncs/progress/:document", get(get_progress))
			.layer(middleware::from_fn(authorize)) // Note the order!
			.layer(middleware::from_fn_with_state(
				app_state,
				api_key_middleware,
			)),
	)
}

/// A secondary authorization middleware to ensure that the user has access to the
/// koreader sync endpoints. This is purely for convenience
async fn authorize(req: Request, next: Next) -> APIResult<Response> {
	let ctx = req
		.extensions()
		.get::<RequestContext>()
		.ok_or(APIError::Unauthorized)?;
	ctx.enforce_permissions(&[UserPermission::AccessKoreaderSync])?;
	Ok(next.run(req).await)
}

#[derive(Serialize)]
struct CheckAuthorizedResponse {
	authorized: String,
}

async fn check_authorized() -> APIResult<Json<CheckAuthorizedResponse>> {
	Ok(Json(CheckAuthorizedResponse {
		authorized: "OK".to_string(),
	}))
}

#[skip_serializing_none]
#[derive(Default, Serialize, Deserialize)]
struct GetProgressResponse {
	/// A hash of the book, generated by koreader. This is used as an alternative method for
	/// identifying a book, since koreader is unaware of the book's ID in stump
	document: String,
	/// A string representing the current position in the book, as understood by koreader. This
	/// can be one of two things:
	///
	/// - A page number for page-based books (e.g. "24")
	/// - An x-pointer for DOM-based books, using their "scrolling" reader. This maps to the location
	///   in the DOM at the top of the screen at the time of sync. This is **not** an epubcfi string.
	///
	/// Please see this wonderful comment for additional context: https://github.com/stumpapp/stump/issues/239#issuecomment-2428256328
	progress: Option<String>,
	/// The reading progress of the book, as a percentage (0-1.0)
	percentage: Option<f32>,
	/// The name of the koreader device.
	device: Option<String>,
	/// The ID of the koreader device, generated by koreader. Stump will use this to identify a
	/// registered reading device, if one exists with the ID.
	device_id: Option<String>,
	/// The timestamp of the last progress update, in milliseconds since the Unix epoch.
	timestamp: Option<u64>,
}

async fn get_progress(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	Path(KOReaderURLParams {
		params: KOReaderDocumentURLParams { document },
		..
	}): Path<KOReaderURLParams<KOReaderDocumentURLParams>>,
) -> APIResult<Json<GetProgressResponse>> {
	let client = &ctx.db;
	let user = req.user();
	let document_cpy = document.clone();

	let (active_session, finished_session) = client
		._transaction()
		.run(|tx| async move {
			let active_session = tx
				.active_reading_session()
				.find_first(vec![
					active_reading_session::user_id::equals(user.id.clone()),
					active_reading_session::media::is(vec![
						media::koreader_hash::equals(Some(document_cpy.clone())),
					]),
				])
				.include(reading_session_koreader::include())
				.exec()
				.await?;

			tx.finished_reading_session()
				.find_first(vec![
					finished_reading_session::user_id::equals(user.id.clone()),
					finished_reading_session::media::is(vec![
						media::koreader_hash::equals(Some(document_cpy)),
					]),
				])
				.include(finished_session_koreader::include())
				.exec()
				.await
				.map(|session| (active_session, session))
		})
		.await?;

	let progress = match (active_session, finished_session) {
		(Some(active_session), _) => GetProgressResponse {
			document,
			percentage: active_session.percentage_completed.map(|p| p as f32),
			timestamp: Some(active_session.updated_at.timestamp_millis() as u64),
			device: active_session.device.as_ref().map(|d| d.name.clone()),
			device_id: active_session.device.as_ref().map(|d| d.id.clone()),
			progress: active_session
				.koreader_progress
				.or_else(|| active_session.page.map(|p| p.to_string())),
		},
		(_, Some(finished_session)) => GetProgressResponse {
			document,
			percentage: Some(1.0),
			timestamp: Some(finished_session.completed_at.timestamp_millis() as u64),
			device: finished_session.device.as_ref().map(|d| d.name.clone()),
			device_id: finished_session.device.as_ref().map(|d| d.id.clone()),
			..Default::default()
		},
		_ => GetProgressResponse {
			document,
			..Default::default()
		},
	};

	Ok(Json(progress))
}

enum NativeProgress {
	Page(i32),
	EpubCfi(String),
}

/// Attempts to parse the progress string into a native progress type. If the progress string
/// cannot be parsed, it is assumed to be an x-pointer. Stump does not support x-pointers, so
/// this function will return `None` in that case.
fn parse_progress(progress: &str) -> Option<NativeProgress> {
	// This is a super naive check, but it should be good enough for now. Eventually
	// I would really like to try and parse the x-pointer and translate it to a valid
	// epubcfi if possible. The closest I've seen online to an epubcfi parser in rust is
	// https://github.com/tnahs/readstor/blob/main/src/lib/models/epubcfi.rs. There are others
	// in JS that can be ported, as well
	if progress.starts_with("epubcfi(") && progress.ends_with(')') {
		Some(NativeProgress::EpubCfi(progress.to_string()))
	} else {
		progress.parse::<i32>().ok().map(NativeProgress::Page)
	}
}

#[derive(Deserialize)]
struct PutProgressInput {
	document: String,
	progress: String,
	percentage: f32,
	device: String,
	device_id: String,
}

#[derive(Deserialize, Serialize)]
struct PutProgressResponse {
	document: String,
	timestamp: u64,
}

async fn put_progress(
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	Json(PutProgressInput {
		document,
		progress,
		percentage,
		device,
		device_id,
	}): Json<PutProgressInput>,
) -> APIResult<Json<PutProgressResponse>> {
	let client = &ctx.db;
	let user = req.user();

	if !(0.0..=1.0).contains(&percentage) {
		tracing::error!(
			percentage,
			"Invalid percentage provided for progress update"
		);
		return Err(APIError::BadRequest("Invalid percentage".to_string()));
	}

	let book = client
		.media()
		.find_first(vec![media::koreader_hash::equals(Some(document.clone()))])
		.exec()
		.await?
		.ok_or_else(|| APIError::NotFound("Book not found".to_string()))?;

	let is_completed = percentage == 1.0;
	let document_cpy = document.clone();
	let (active_session, finished_session) = client
		._transaction()
		.run(|tx| async move {
			let _device_record = tx
				.registered_reading_device()
				.upsert(
					registered_reading_device::id::equals(device_id.clone()),
					(
						device.clone(),
						vec![registered_reading_device::id::set(device_id.clone())],
					),
					vec![registered_reading_device::name::set(device.clone())],
				)
				.exec()
				.await?;

			let existing_active_session = tx
				.active_reading_session()
				.find_first(vec![
					active_reading_session::user_id::equals(user.id.clone()),
					active_reading_session::media::is(vec![
						media::koreader_hash::equals(Some(document_cpy.clone())),
					]),
				])
				.exec()
				.await?;

			if is_completed {
				if let Some(ref active_session) = existing_active_session {
					tx.active_reading_session()
						.delete(active_reading_session::id::equals(
							active_session.id.clone(),
						))
						.exec()
						.await?;
				}

				tx.finished_reading_session()
					.create(
						existing_active_session
							.map(|s| s.started_at)
							.unwrap_or_default(),
						media::id::equals(book.id.clone()),
						user::id::equals(user.id.clone()),
						vec![finished_reading_session::device::connect(
							registered_reading_device::id::equals(device_id.clone()),
						)],
					)
					.exec()
					.await
					.map(|session| (None, Some(session)))
			} else {
				let native_progress_set_param: Option<active_reading_session::SetParam> =
					match parse_progress(&progress) {
						Some(NativeProgress::Page(page)) => {
							Some(active_reading_session::page::set(Some(page)))
						},
						Some(NativeProgress::EpubCfi(cfi)) => {
							Some(active_reading_session::epubcfi::set(Some(cfi)))
						},
						_ => {
							tracing::debug!(
								progress,
								"Failed to parse progress string, assuming x-pointer"
							);
							None
						},
					};

				let set_params = chain_optional_iter(
					[
						active_reading_session::koreader_progress::set(Some(
							progress.clone(),
						)),
						active_reading_session::percentage_completed::set(Some(
							percentage as f64,
						)),
						active_reading_session::device::connect(
							registered_reading_device::id::equals(device_id.clone()),
						),
					],
					[native_progress_set_param],
				);

				tx.active_reading_session()
					.upsert(
						active_reading_session::user_id_media_id(
							user.id.clone(),
							book.id.clone(),
						),
						(
							media::id::equals(book.id.clone()),
							user::id::equals(user.id.clone()),
							set_params.clone(),
						),
						set_params,
					)
					.exec()
					.await
					.map(|session| (Some(session), None))
			}
		})
		.await?;

	let timestamp = match (active_session, finished_session) {
		(Some(active_session), _) => active_session.updated_at.timestamp_millis() as u64,
		(_, Some(finished_session)) => {
			finished_session.completed_at.timestamp_millis() as u64
		},
		_ => {
			tracing::error!("Failed to update progress!");
			return Err(APIError::InternalServerError(
				"Failed to update progress".to_string(),
			));
		},
	};

	Ok(Json(PutProgressResponse {
		document,
		timestamp,
	}))
}
