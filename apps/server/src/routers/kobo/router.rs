use crate::routers::kobo::{kepub, proxy, sync::KoboSync};
use axum::{
	body::to_bytes,
	extract::{Path, Request, State},
	http::{HeaderMap, HeaderValue},
	middleware::{self, Next},
	response::{IntoResponse, Json, Redirect, Response},
	routing::{any, get},
	Extension, Router,
};
use graphql::data::AuthContext;
use models::{
	entity::media,
	services::reading_progress::{
		reset_reading_progress, reset_reading_progress_with_reported_at,
		upsert_reading_session,
	},
	shared::{
		enums::UserPermission,
		image_processor_options::{
			FitWithinResize, ImageProcessorOptions, ImageResizeMethod,
			SupportedImageFormat,
		},
	},
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect, TransactionTrait};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map};
use stump_core::{
	filesystem::{
		image::{GenericImageProcessor, ImageProcessor},
		ContentType,
	},
	kobo::{entity::MediaWithMetadataAndReadingSessions, position::KoboPositionMap},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::{auth::api_key_middleware, host::HostExtractor},
	routers::{
		api::v2::media::get_media_thumbnail_by_id,
		kobo::sync_token::{SyncState, SyncToken},
	},
	utils::http::ImageResponse,
	utils::serve_media,
};
use stump_core::kobo::sync_types::*;

#[derive(Debug, Serialize, Deserialize)]
struct KoboAPIKey {
	api_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct KoboAPIKeyAndBookId {
	api_key: String,
	book_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct KoboThumbnail {
	api_key: String,
	book_id: String,
	width: u32,
	height: u32,
	quality: Option<String>,
	is_greyscale: Option<String>,
}

// how many items should we send in each page of a sync response?
// this is a maximum; in some cases we may return fewer items in a page.
const ITEMS_PER_PAGE: usize = 100;

struct SyncResponse {
	sync_items: Vec<SyncItem>,
	sync_token: HeaderValue,
	should_continue: bool,
}

impl IntoResponse for SyncResponse {
	fn into_response(self) -> Response {
		let mut response = Json(self.sync_items).into_response();
		if self.should_continue {
			response
				.headers_mut()
				.insert("x-kobo-sync", HeaderValue::from_static("continue"));
		}

		response
			.headers_mut()
			.insert("x-kobo-synctoken", self.sync_token);

		response
	}
}

fn sync_token_header(sync_token: &SyncToken) -> APIResult<HeaderValue> {
	sync_token.try_to_header_value().map_err(|error| {
		tracing::warn!(?error, "Failed to produce Kobo sync token");
		APIError::InternalServerError("Could not produce a Kobo sync token".to_string())
	})
}

fn kepub_prepare_error(error: kepub::KepubError) -> APIError {
	APIError::InternalServerError(error.to_string())
}

/// Mounts the Kobo sync router at `/kobo` (from the parent router).
/// These endpoints are not documented anywhere, but Komga's reverse-engineered
/// implementation is a decent place to start.
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/{api_key}",
		Router::new()
			.route("/", any(proxy_fallback))
			.route("/v1/initialization", get(initialization))
			.route("/v1/library/sync", get(library_sync))
			.route("/v1/library/{book_id}/metadata", get(book_metadata))
			.route(
				"/v1/library/{book_id}/state",
				get(book_state).put(update_book_state),
			)
			.route(
				"/v1/books/{book_id}/thumbnail/{width}/{height}/{is_greyscale}/image.jpg",
				get(book_thumbnail),
			)
			.route(
				"/v1/books/{book_id}/thumbnail/{width}/{height}/{quality}/{is_greyscale}/image.jpg",
				get(book_thumbnail)
			)
			.route("/v1/books/{book_id}/file/epub", get(book_download))
			.route("/{*path}", any(proxy_fallback))
			.method_not_allowed_fallback(proxy_fallback)
			.layer(middleware::from_fn(authorize)) // Note the order!
			.layer(middleware::from_fn_with_state(
				app_state,
				api_key_middleware,
			)),
	)
}

async fn proxy_local_miss(request: Request, api_key: &str) -> APIResult<Response> {
	match proxy::forward(request, api_key, None).await {
		Ok(response) => Ok(response.into_response()),
		Err(error) => {
			tracing::warn!(?error, "Kobo Store book proxy failed");
			Err(APIError::BadGateway(
				"Kobo Store request failed".to_string(),
			))
		},
	}
}

/// A secondary authorization middleware to ensure that the user has access to the
/// kobo sync endpoints. This is purely for convenience
async fn authorize(req: Request, next: Next) -> APIResult<Response> {
	let ctx = req
		.extensions()
		.get::<AuthContext>()
		.ok_or(APIError::Unauthorized)?;
	ctx.enforce_permissions(&[UserPermission::AccessKoboSync])
		.map_err(|_| {
			APIError::Forbidden("You do not have permission to use Kobo sync".to_string())
		})?;
	Ok(next.run(req).await)
}

async fn initialization(
	HostExtractor(host): HostExtractor,
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
	request: Request,
) -> APIResult<Response> {
	let base_url = host.url();
	let template = format!(
		"{}/kobo/{}/v1/books/{{ImageId}}/thumbnail/{{Width}}/{{Height}}/{{IsGreyscale}}/image.jpg",
		base_url, api_key
	);
	let quality_template = format!(
		"{}/kobo/{}/v1/books/{{ImageId}}/thumbnail/{{Width}}/{{Height}}/{{Quality}}/{{IsGreyscale}}/image.jpg",
		base_url, api_key
	);
	let mut overrides = Map::new();
	overrides.insert("image_host".to_string(), json!(base_url));
	overrides.insert(
		"image_url_quality_template".to_string(),
		json!(quality_template),
	);
	overrides.insert("image_url_template".to_string(), json!(template));
	overrides.insert(
		"library_sync".to_string(),
		json!(format!("{base_url}/kobo/{api_key}/v1/library/sync")),
	);

	let upstream = match proxy::forward(request, &api_key, None).await {
		Ok(response) if response.is_success() => response.json().ok(),
		Ok(response) => {
			tracing::warn!(status = %response.status(), "Kobo initialization proxy failed");
			None
		},
		Err(error) => {
			tracing::warn!(?error, "Kobo initialization proxy failed");
			None
		},
	};
	let resources = proxy::merge_initialization_resources(upstream, overrides);

	let mut headers = HeaderMap::new();
	// Note: i couldn't find reference to _why_ this is needed, but Komga includes the header. it should be
	// harmless, as e30= is just a base64 of "{}"
	headers.insert("x-kobo-apitoken", HeaderValue::from_static("e30="));

	Ok((headers, Json(resources)).into_response())
}

fn device_metadata(headers: &HeaderMap) -> serde_json::Map<String, serde_json::Value> {
	let mut result = Map::new();
	for (key, val) in headers.iter() {
		let key = key.to_string();

		if !key.starts_with("x-kobo-")
			|| matches!(
				key.as_str(),
				"x-kobo-synctoken" | "x-kobo-userkey" | "x-kobo-apitoken"
			) {
			continue;
		}

		let val = match val.to_str() {
			Ok(v) => v.to_string(),
			Err(_) => continue,
		};

		result.insert(key, serde_json::Value::String(val));
	}

	result
}

async fn library_sync(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	HostExtractor(host): HostExtractor,
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
	request: Request,
) -> APIResult<Response> {
	let conn = ctx.conn.as_ref();
	let user = req.user();
	let headers = request.headers().clone();

	let client_sync_token = headers
		.get("x-kobo-synctoken")
		.map(SyncToken::try_from_header_value)
		.transpose()
		.map_err(|error| {
			tracing::warn!(?error, "Could not parse client's Kobo sync token");
			APIError::BadRequest("Invalid Kobo sync token".to_string())
		})?
		.unwrap_or_else(|| SyncToken::new(None, None, 0));
	let server_content_version = kepub::server_content_version().await;
	let content_version =
		client_sync_token.effective_content_version(server_content_version);
	let requires_full_sync = client_sync_token.requires_full_sync(server_content_version);

	if !requires_full_sync {
		if let Some(SyncState::UpstreamV1 { sync_id }) = &client_sync_token.state {
			let sync_id = sync_id.clone();
			return proxy_store_sync(
				request,
				&api_key,
				&sync_id,
				client_sync_token.kobo_store_token,
				content_version,
			)
			.await;
		}
	}

	let device_id = headers.get("x-kobo-deviceid").and_then(|h| h.to_str().ok());
	if device_id.is_none() {
		// the device ID is not critical to the sync process, but it's useful metadata.
		tracing::warn!("Client did not pass a valid x-kobo-deviceid");
	}

	let device_metadata = device_metadata(&headers);
	let continuing_local_sync = !requires_full_sync
		&& matches!(
			&client_sync_token.state,
			Some(SyncState::IncompleteV1 { .. })
		);
	if !continuing_local_sync {
		let cached_book_keys = kepub::cached_book_keys(ctx.config.as_ref()).await;
		if !cached_book_keys.is_empty() {
			let live_media_ids: Vec<String> = media::Entity::find()
				.filter(media::Entity::epub_filter())
				.filter(media::Column::DeletedAt.is_null())
				.select_only()
				.column(media::Column::Id)
				.into_tuple()
				.all(conn)
				.await?;
			kepub::prune_deleted_cache(
				ctx.config.as_ref(),
				&cached_book_keys,
				&live_media_ids,
			)
			.await;
		}
	}

	let sync_page = KoboSync::next_page(
		conn,
		&user,
		device_id,
		serde_json::Value::Object(device_metadata),
		if requires_full_sync {
			None
		} else {
			client_sync_token.state.as_ref()
		},
		ITEMS_PER_PAGE,
	)
	.await?;

	let kobo_api_base_url = format!("{}/kobo/{}", host.url(), api_key);
	let sync_items = sync_page
		.sync_items(ctx.config.as_ref(), kobo_api_base_url.as_str())
		.await?;
	let sync_state = if sync_page.should_continue {
		sync_page.sync_state
	} else {
		SyncState::UpstreamV1 {
			sync_id: sync_page.sync_state.sync_id().to_string(),
		}
	};
	let sync_token = SyncToken::new(
		Some(sync_state),
		client_sync_token.kobo_store_token,
		content_version,
	);

	// if we don't send a sync token the client will send no sync token on its next sync,
	// essentially starting the sync process from scratch. that's not a disaster, but it's
	// a weird enough case that it's simpler to error loudly.
	let sync_token = sync_token_header(&sync_token)?;

	Ok(SyncResponse {
		sync_items,
		// The final local page is followed by at least one Store page.
		should_continue: true,
		sync_token,
	}
	.into_response())
}

async fn proxy_store_sync(
	request: Request,
	api_key: &str,
	sync_id: &str,
	store_token: Option<String>,
	content_version: u8,
) -> APIResult<Response> {
	match proxy::forward(request, api_key, store_token.as_deref()).await {
		Ok(upstream)
			if upstream.is_success()
				&& upstream.json().is_ok_and(|body| body.is_array()) =>
		{
			let should_continue =
				upstream.should_continue() && upstream.sync_token().is_some();
			let store_token = upstream.sync_token().map(str::to_string).or(store_token);
			let state = if should_continue {
				SyncState::UpstreamV1 {
					sync_id: sync_id.to_string(),
				}
			} else {
				SyncState::CompletedV1 {
					sync_id: sync_id.to_string(),
				}
			};
			let sync_token = sync_token_header(&SyncToken::new(
				Some(state),
				store_token,
				content_version,
			))?;
			let mut response = upstream.into_response();
			if should_continue {
				response
					.headers_mut()
					.insert("x-kobo-sync", HeaderValue::from_static("continue"));
			} else {
				response.headers_mut().remove("x-kobo-sync");
			}
			response
				.headers_mut()
				.insert("x-kobo-synctoken", sync_token);
			return Ok(response);
		},
		Ok(upstream) => {
			tracing::warn!(status = %upstream.status(), "Kobo Store library sync failed");
		},
		Err(error) => tracing::warn!(?error, "Kobo Store library sync failed"),
	}

	let sync_token = sync_token_header(&SyncToken::new(
		Some(SyncState::CompletedV1 {
			sync_id: sync_id.to_string(),
		}),
		store_token,
		content_version,
	))?;
	Ok(SyncResponse {
		sync_items: vec![],
		sync_token,
		should_continue: false,
	}
	.into_response())
}

async fn book_metadata(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	HostExtractor(host): HostExtractor,
	Path(KoboAPIKeyAndBookId { api_key, book_id }): Path<KoboAPIKeyAndBookId>,
	request: Request,
) -> APIResult<Response> {
	let conn = ctx.conn.as_ref();
	let user = req.user();

	let Some(m) =
		MediaWithMetadataAndReadingSessions::find_by_id_for_user(book_id, &user)
			.filter(media::Entity::epub_filter())
			.filter(media::Column::DeletedAt.is_null())
			.into_model::<MediaWithMetadataAndReadingSessions>()
			.one(conn)
			.await?
	else {
		return proxy_local_miss(request, &api_key).await;
	};

	let book_url = format!(
		"{}/kobo/{}/v1/books/{}/file/epub",
		host.url(),
		api_key,
		m.media.id
	);

	let mut result = BookMetadata::from_media(&m, book_url);
	let download = kepub::prepare_download(ctx.config.as_ref(), &m.media)
		.await
		.map_err(kepub_prepare_error)?;
	download.content.apply_to_metadata(&mut result);
	Ok(Json(vec![result]).into_response())
}

async fn kobo_position_map(
	ctx: &AppState,
	book: &media::Model,
) -> APIResult<Option<KoboPositionMap>> {
	let download = kepub::prepare_download(ctx.config.as_ref(), book)
		.await
		.map_err(kepub_prepare_error)?;
	Ok(kepub::position_map(ctx.config.as_ref(), &download, &book.id).await)
}

async fn book_state(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboAPIKeyAndBookId { api_key, book_id }): Path<KoboAPIKeyAndBookId>,
	request: Request,
) -> APIResult<Response> {
	let user = req.user();
	let Some(book) =
		MediaWithMetadataAndReadingSessions::find_by_id_for_user(book_id, &user)
			.filter(media::Entity::epub_filter())
			.filter(media::Column::DeletedAt.is_null())
			.into_model::<MediaWithMetadataAndReadingSessions>()
			.one(ctx.conn.as_ref())
			.await?
	else {
		return proxy_local_miss(request, &api_key).await;
	};

	let positions = kobo_position_map(&ctx, &book.media).await?;
	Ok(Json(vec![ReadingState::from_media(&book, positions.as_ref())]).into_response())
}

fn valid_percent(percent: f32) -> bool {
	percent.is_finite() && (0.0..=100.0).contains(&percent)
}

async fn update_book_state(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboAPIKeyAndBookId { api_key, book_id }): Path<KoboAPIKeyAndBookId>,
	request: Request,
) -> APIResult<Response> {
	let user = req.user();
	let local_book = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(&book_id))
		.filter(media::Entity::epub_filter())
		.filter(media::Column::DeletedAt.is_null())
		.one(ctx.conn.as_ref())
		.await?;
	let Some(book) = local_book else {
		return proxy_local_miss(request, &api_key).await;
	};

	let device_id = request
		.headers()
		.get("x-kobo-deviceid")
		.and_then(|value| value.to_str().ok())
		.map(str::to_string);
	let body = to_bytes(request.into_body(), 2 * 1024 * 1024)
		.await
		.map_err(|error| APIError::BadRequest(error.to_string()))?;
	let payload: ReadingStateUpdateRequest = serde_json::from_slice(&body)
		.map_err(|error| APIError::BadRequest(error.to_string()))?;
	let update = payload
		.reading_states
		.iter()
		.find(|update| update.entitlement_id == book_id)
		.ok_or_else(|| {
			APIError::BadRequest("No reading state matched the book ID".to_string())
		})?;
	let status = update.status().ok_or_else(|| {
		APIError::BadRequest("Reading state status is required".to_string())
	})?;
	if update.current_bookmark.as_ref().is_some_and(|bookmark| {
		bookmark
			.progress_percent
			.is_some_and(|percent| !valid_percent(percent))
			|| bookmark
				.content_source_progress_percent
				.is_some_and(|percent| !valid_percent(percent))
	}) || (status == Status::Reading
		&& update
			.current_bookmark
			.as_ref()
			.and_then(|bookmark| bookmark.progress_percent)
			.is_none())
	{
		return Err(APIError::BadRequest(
			"Reading percentages must be finite values between 0 and 100".to_string(),
		));
	}

	let finished_position = if status == Status::Finished {
		kobo_position_map(&ctx, &book)
			.await?
			.and_then(|positions| positions.last())
	} else {
		None
	};
	let transaction = ctx.conn.begin().await?;
	match status {
		Status::ReadyToRead => {
			if let Some(last_modified) = update.last_modified {
				reset_reading_progress_with_reported_at(
					&transaction,
					&user,
					&book_id,
					last_modified.into(),
				)
				.await?;
			} else {
				reset_reading_progress(&transaction, &user, &book_id).await?;
			}
		},
		Status::Reading | Status::Finished => {
			let mut progression = update.normalized_progression(device_id);
			if status == Status::Finished {
				progression.locator =
					finished_position.map(|position| position.into_readium_locator(1.0));
			}
			upsert_reading_session(&transaction, &user, &book_id, progression).await?;
		},
	};
	transaction.commit().await?;

	Ok(Json(ReadingStateUpdateResponse::success(vec![
		ReadingStateUpdateResult::success(update),
	]))
	.into_response())
}

async fn book_thumbnail(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboThumbnail {
		book_id,
		width,
		height,
		quality,
		is_greyscale,
		..
	}): Path<KoboThumbnail>,
) -> APIResult<Response> {
	let result = match get_media_thumbnail_by_id(&ctx, &req.user(), book_id.clone()).await
	{
		Ok(result) => result,
		Err(APIError::NotFound(_)) => {
			let quality = quality
				.map(|quality| format!("/{quality}"))
				.unwrap_or_default();
			let url = format!(
				"https://cdn.kobo.com/book-images/{}/{width}/{height}{quality}/{}/image.jpg",
				urlencoding::encode(&book_id),
				urlencoding::encode(is_greyscale.as_deref().unwrap_or("false")),
			);
			return Ok(Redirect::temporary(&url).into_response());
		},
		Err(error) => return Err(error),
	};

	// the Kobo only supports JPEGs, and doesn't need large thumbnails.
	let jpeg_buffer = tokio::task::block_in_place(|| {
		let converted = GenericImageProcessor::generate(
			&result.data,
			ImageProcessorOptions {
				format: SupportedImageFormat::Jpeg,
				resize_method: Some(ImageResizeMethod::FitWithin(FitWithinResize {
					width,
					height,
				})),
				..Default::default()
			},
		)?;
		Ok::<Vec<u8>, APIError>(converted)
	})?;

	Ok(ImageResponse::new(ContentType::JPEG, jpeg_buffer).into_response())
}

async fn book_download(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboAPIKeyAndBookId { book_id, .. }): Path<KoboAPIKeyAndBookId>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	let book =
		serve_media::find_downloadable_media(&req, ctx.conn.as_ref(), book_id).await?;
	if !book.extension.eq_ignore_ascii_case("epub") || book.deleted_at.is_some() {
		return Err(APIError::NotFound("Book not found".to_string()));
	}
	let download = kepub::prepare_download(ctx.config.as_ref(), &book)
		.await
		.map_err(kepub_prepare_error)?;
	serve_media::serve_file_path(headers, &download.path, Some(&download.filename)).await
}

async fn proxy_fallback(
	Path(KoboAPIKey { api_key }): Path<KoboAPIKey>,
	request: Request,
) -> Response {
	match proxy::forward(request, &api_key, None).await {
		Ok(response) => response.into_response(),
		Err(error) => {
			tracing::warn!(?error, "Kobo Store proxy failed");
			Json(json!({})).into_response()
		},
	}
}

#[cfg(test)]
mod tests {
	use super::device_metadata;
	use axum::http::{HeaderMap, HeaderValue};

	#[test]
	fn device_metadata_excludes_credentials() {
		let mut headers = HeaderMap::new();
		headers.insert("x-kobo-deviceid", HeaderValue::from_static("device"));
		headers.insert("x-kobo-userkey", HeaderValue::from_static("secret"));
		headers.insert("x-kobo-synctoken", HeaderValue::from_static("secret"));

		let metadata = device_metadata(&headers);
		assert_eq!(metadata["x-kobo-deviceid"], "device");
		assert!(!metadata.contains_key("x-kobo-userkey"));
		assert!(!metadata.contains_key("x-kobo-synctoken"));
	}
}
