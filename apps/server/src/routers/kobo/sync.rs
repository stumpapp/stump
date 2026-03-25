use std::str::Utf8Error;

use axum::{
	body::Body,
	extract::{Path, Request, State},
	http::{header, HeaderMap, HeaderValue},
	middleware::{self, Next},
	response::{IntoResponse, Json, Response},
	routing::get,
	Extension, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use graphql::data::AuthContext;
use models::{
	entity::{
		kobo_sync,
		media::{self, ModelWithMetadata},
		user::AuthUser,
	},
	shared::{
		enums::UserPermission,
		image_processor_options::{
			ExactDimensionResize, ImageProcessorOptions, ImageResizeMethod,
			SupportedImageFormat,
		},
	},
};
use reqwest::header::{InvalidHeaderValue, ToStrError};
use sea_orm::Set;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map};
use stump_core::filesystem::{
	image::{GenericImageProcessor, ImageProcessor},
	ContentType,
};
use thiserror::Error;
use tower_http::services::ServeFile;

use sea_orm::prelude::*;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::api_key_middleware,
	routers::{api::v2::media::get_media_thumbnail_by_id, kobo::sync_types::*},
	utils::http::ImageResponse,
};

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
	is_greyscale: Option<String>,
}

const BASE_URL: &str = "http://192.168.4.100:25601";

struct SyncResponse {
	sync_items: Vec<SyncItem>,
	sync_token: SyncToken,
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

		match self.sync_token.try_to_header_value() {
			Ok(sync_token) => {
				response
					.headers_mut()
					.insert("x-kobo-synctoken", sync_token);
			},
			Err(e) => tracing::error!(?e, "Failed to produce Kobo sync token"),
		}
		response
	}
}

#[derive(Debug, Serialize, Deserialize)]
struct SyncToken {
	// allows us to change the structure of the token in the future.
	version: u64,

	sync_id: String,
	offset: u64,
	count: usize,
}

#[derive(Error, Debug)]
enum SyncTokenSerializeError {
	#[error("Could not serialize JSON: {0}")]
	JSONError(#[from] serde_json::Error),
	#[error("Could not encode this token as a header: {0}")]
	InvalidHeaderError(#[from] InvalidHeaderValue),
}

#[derive(Error, Debug)]
enum SyncTokenDeserializeError {
	#[error("Could not deserialize string from header: {0}")]
	HeaderToStrError(#[from] ToStrError),
	#[error("Could not decode UTF-8: {0}")]
	UTF8Error(#[from] Utf8Error),
	#[error("Could not decode Base64: {0}")]
	Base64Error(#[from] base64::DecodeError),
	#[error("Could not deserialize JSON: {0}")]
	JSONError(#[from] serde_json::Error),
}

impl SyncToken {
	fn try_from_str(s: &str) -> Result<Self, SyncTokenDeserializeError> {
		let json_bytes = BASE64.decode(s)?;
		let json = std::str::from_utf8(&json_bytes)?;
		serde_json::from_str(json).map_err(Into::into)
	}

	fn try_from_header_value(
		hv: &HeaderValue,
	) -> Result<Self, SyncTokenDeserializeError> {
		let s = hv.to_str()?;
		Self::try_from_str(s)
	}

	fn try_to_string(self) -> Result<String, SyncTokenSerializeError> {
		let json = serde_json::to_string(&self)?;
		Ok(BASE64.encode(json))
	}

	fn try_to_header_value(self) -> Result<HeaderValue, SyncTokenSerializeError> {
		let s = self.try_to_string()?;
		HeaderValue::from_str(s.as_ref()).map_err(Into::into)
	}
}

struct KoboSync {
	model: kobo_sync::Model,
}

impl KoboSync {
	async fn find(db: &DatabaseConnection, user: &AuthUser, id: String) -> Option<Self> {
		kobo_sync::Entity::find_by_id(id)
			.one(db)
			.await
			.ok()?
			.and_then(|m| {
				if m.user_id != user.id {
					tracing::warn!("Attempted to use another user's Kobo sync token");
					None
				} else {
					Some(KoboSync { model: m })
				}
			})
	}

	async fn begin_new_sync(
		db: &DatabaseConnection,
		user: &AuthUser,
		device_id: Option<&str>,
		device_metadata: serde_json::Value,
		previous_sync_at: Option<DateTimeWithTimeZone>,
	) -> Result<Self, sea_orm::DbErr> {
		let query = match previous_sync_at {
			Some(previous_sync_at) => media::Entity::find_for_user(&user)
				.filter(media::Column::Extension.eq("epub"))
				.filter(media::Column::CreatedAt.gte(previous_sync_at)),
			None => media::Entity::find_for_user(&user)
				.filter(media::Column::Extension.eq("epub")),
		};

		// TODO: add modified (and deleted?) media
		// TODO: avoid copies & retrieving unused column "path"
		// https://www.sea-ql.org/SeaORM/docs/1.1.x/advanced-query/custom-select/#unstructured-tuple

		let new_media = query
			.into_model::<media::MediaIdentSelect>()
			.all(db)
			.await?;

		tracing::debug!(
			?previous_sync_at,
			new_media_count = new_media.len(),
			"Beginning new Kobo sync"
		);

		let sync = kobo_sync::ActiveModel {
			user_id: Set(user.id.clone()),
			media_ids: Set(kobo_sync::MediaIds(
				new_media.iter().map(|m| m.id.clone()).collect(),
			)),
			device_id: Set(device_id.unwrap_or("").to_string()),
			device_metadata: Set(device_metadata),
			..Default::default()
		};
		let sync = sync.insert(db).await?;
		Ok(Self { model: sync })
	}
}

/// Mounts the koreader sync router at `/kobo` (from the parent router).
/// These endpoints are not documented anywhere, but Komga's reverse-engineered
/// implementation is a decent place to start.
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/{api_key}",
		Router::new()
			.route("/v1/initialization", get(initialization))
			.route("/v1/library/sync", get(library_sync))
			.route("/v1/library/{book_id}/metadata", get(book_metadata))
      .route("/v1/books/{book_id}/thumbnail/{width}/{height}/{is_greyscale}/image.jpg", get(book_thumbnail))
      .route("/v1/books/{book_id}/thumbnail/{width}/{height}/{quality}/{is_greyscale}/image.jpg", get(book_thumbnail))
			.route("/v1/books/{book_id}/file/epub", get(book_download))
			// The Kobo requests many routes that we don't implement.
			.route("/v1/{*path}", get(empty_json).post(empty_json).delete(empty_json))
			.layer(middleware::from_fn(authorize)) // Note the order!
			.layer(middleware::from_fn_with_state(
				app_state,
				api_key_middleware,
			)),
	)
}

async fn empty_json() -> APIResult<impl IntoResponse> {
	Ok(Json(json!({})))
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
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
) -> APIResult<impl IntoResponse> {
	Ok(Json(json![{
		   "image_url_quality_template": format!("{}/kobo/{}/v1/books/{{ImageId}}/thumbnail/{{Width
	}}/{{Height}}/{{Quality}}/{{IsGreyscale}}/image.jpg", BASE_URL, api_key),
		   "image_url_template": format!("{}/kobo/{}/v1/books/{{ImageId}}/thumbnail/{{Width
	}}/{{Height}}/image.jpg", BASE_URL, api_key),
	}]))
}

fn device_metadata(headers: &HeaderMap) -> serde_json::Map<String, serde_json::Value> {
	let mut result = Map::new();
	for (key, val) in headers.iter() {
		let key = key.to_string();

		if !key.starts_with("x-kobo-") || key == "x-kobo-synctoken" {
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
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	let conn = ctx.conn.as_ref();
	let user = req.user();

	let prev_sync_token = headers.get("x-kobo-synctoken").and_then(|h| {
		match SyncToken::try_from_header_value(h) {
			Ok(sync_token) => Some(sync_token),
			Err(e) => {
				tracing::error!(?e, "Could not load client's Kobo sync token");
				None
			},
		}
	});

	let device_id = headers.get("x-kobo-deviceid").and_then(|h| h.to_str().ok());
	if device_id.is_none() {
		tracing::error!("Client did not pass a valid x-kobo-deviceid");
	}

	let device_metadata = device_metadata(&headers);

	let prev_sync = match prev_sync_token {
		Some(t) => KoboSync::find(&conn, &user, t.sync_id).await,
		None => None,
	};

	let sync = KoboSync::begin_new_sync(
		&conn,
		&user,
		device_id,
		serde_json::Value::Object(device_metadata),
		prev_sync.map(|s| s.model.created_at.fixed_offset()),
	)
	.await?;

	// prev_sync = KoboSync.find_by_sync_token(prev_sync_token)
	//
	// # the last page in the sync was acknowledged, or it has been too long since it was sent.
	// previous_sync_completed = prev_sync.mark_page_acknowledged(prev_sync_token)
	//
	// if prev_sync is None or previous_sync_completed:
	//    # begin a new sync
	//    # compute the items that should be included in this sync
	//    # TODO: include x-kobo-deviceid, x-kobo-devicemodel, x-kobo-deviceos
	//    # (really any x-kobo header)
	//    sync = KoboSync.new(prev_sync: prev_sync)
	//    sync_page = sync.get_page(0, SYNC_LIMIT)
	// else:
	//    # return the next page of this sync
	//    sync = prev_sync
	//    sync_page = sync.get_next_page(SYNC_LIMIT)
	//
	// sync_token = sync_page.sync_token
	// sync_items = sync_page.get_sync_items
	//
	// TODO: delete any KoboSyncs prior to the prev_sync for this x-kobo-deviceid
	//
	// TODO: how does this interact with the proxy? especially pagination
	// Komga proxies once its own material has been synced.

	let media_ids = sync.model.media_ids;
	let items = ModelWithMetadata::find_by_ids_for_user(media_ids.0, &user)
		.filter(media::Column::Extension.eq("epub"))
		.into_model::<media::ModelWithMetadata>()
		.all(conn)
		.await?;

	let result: Vec<SyncItem> = items
		.into_iter()
		.map(|m| {
			let book_url = format!(
				"{}/kobo/{}/v1/books/{}/file/epub",
				BASE_URL, api_key, m.media.id
			);

			SyncItem::NewEntitlement(NewEntitlement::from_media(m, book_url))
		})
		.collect();

	let count = result.len();

	Ok(SyncResponse {
		sync_items: result,
		should_continue: false,
		sync_token: SyncToken {
			sync_id: sync.model.id,
			version: 1,
			offset: 0,
			count: count,
		},
	})
}

async fn book_metadata(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboAPIKeyAndBookId { api_key, book_id }): Path<KoboAPIKeyAndBookId>,
) -> APIResult<Json<Vec<BookMetadata>>> {
	let conn = ctx.conn.as_ref();
	let user = req.user();

	let m = ModelWithMetadata::find_by_id_for_user(book_id, &user)
		.into_model::<media::ModelWithMetadata>()
		.one(conn)
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	let book_url = format!(
		"{}/kobo/{}/v1/books/{}/file/epub",
		BASE_URL, api_key, m.media.id
	);

	let result = BookMetadata::from_media(&m, book_url);
	Ok(Json(vec![result]))
}

async fn book_thumbnail(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboThumbnail {
		book_id,
		width,
		height,
		..
	}): Path<KoboThumbnail>,
) -> APIResult<ImageResponse> {
	let result = get_media_thumbnail_by_id(&ctx, &req.user(), book_id).await?;

	// the Kobo only supports JPEGs, and doesn't need large thumbnails.
	let jpeg_buffer = tokio::task::block_in_place(|| {
		let converted = GenericImageProcessor::generate(
			&result.data,
			ImageProcessorOptions {
				format: SupportedImageFormat::Jpeg,
				// TODO: ImageResizeMethod::FitWithin?
				// (similar implementation to ScaledDimensionResize)
				resize_method: Some(ImageResizeMethod::Exact(ExactDimensionResize {
					width: width,
					height: height,
				})),
				..Default::default()
			},
		)?;
		Ok::<Vec<u8>, APIError>(converted)
	})?;

	Ok(ImageResponse::new(ContentType::JPEG, jpeg_buffer))
}

async fn book_download(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboAPIKeyAndBookId { book_id, .. }): Path<KoboAPIKeyAndBookId>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	// TODO: is this reasonable? would it ever be useful to have kobo sync permission without
	// download file?
	let user = req
		.user_and_enforce_permissions(&[UserPermission::DownloadFile])
		.map_err(|_| {
			tracing::error!("User does not have permission to download file");
			APIError::forbidden_discreet()
		})?;

	let book = media::Entity::find_for_user(&user)
		.filter(media::Column::Id.eq(book_id.clone()))
		.into_model::<media::MediaIdentSelect>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	// Note: I am reusing the original headers to support range requests
	let mut serve_req = Request::new(Body::empty());
	*serve_req.headers_mut() = headers;

	match ServeFile::new(&book.path).try_call(serve_req).await {
		Ok(mut response) => {
			if let Some(filename) = std::path::Path::new(&book.path)
				.file_name()
				.and_then(|os_str| os_str.to_str())
			{
				response.headers_mut().insert(
					header::CONTENT_DISPOSITION,
					format!("attachment; filename=\"{}\"", filename)
						.parse()
						.unwrap_or_else(|_| "attachment".parse().unwrap()),
				);
			}
			Ok(response)
		},
		Err(e) => {
			tracing::error!(error = ?e, path = %book.path, "Error serving media file");
			Err(APIError::InternalServerError(format!(
				"Failed to serve file: {}",
				e
			)))
		},
	}
}
