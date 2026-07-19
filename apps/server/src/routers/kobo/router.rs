use crate::routers::kobo::sync::KoboSync;
use axum::{
	extract::{Path, Request, State},
	http::{HeaderMap, HeaderValue},
	middleware::{self, Next},
	response::{IntoResponse, Json, Response},
	routing::get,
	Extension, Router,
};
use graphql::data::AuthContext;
use models::shared::{
	enums::UserPermission,
	image_processor_options::{
		FitWithinResize, ImageProcessorOptions, ImageResizeMethod, SupportedImageFormat,
	},
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map};
use stump_core::{
	filesystem::{
		image::{GenericImageProcessor, ImageProcessor},
		ContentType,
	},
	kobo::entity::MediaWithMetadataAndReadingSessions,
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::{auth::api_key_middleware, host::HostExtractor},
	routers::{api::v2::media::get_media_thumbnail_by_id, kobo::sync_token::SyncToken},
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
			.route(
				"/v1/books/{book_id}/thumbnail/{width}/{height}/{is_greyscale}/image.jpg",
				get(book_thumbnail),
			)
			.route(
				"/v1/books/{book_id}/thumbnail/{width}/{height}/{quality}/{is_greyscale}/image.jpg",
				get(book_thumbnail)
			)
			.route("/v1/books/{book_id}/file/epub", get(book_download))
			// The Kobo requests many routes that we don't implement.
			.route(
				"/v1/{*path}",
				get(stubbed_route_empty_success)
					.post(stubbed_route_empty_success)
					.put(stubbed_route_empty_success)
					.delete(stubbed_route_empty_success),
			)
			.layer(middleware::from_fn(authorize)) // Note the order!
			.layer(middleware::from_fn_with_state(
				app_state,
				api_key_middleware,
			)),
	)
}

async fn stubbed_route_empty_success() -> APIResult<impl IntoResponse> {
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
	HostExtractor(host): HostExtractor,
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
) -> APIResult<impl IntoResponse> {
	let base_url = host.url();
	let template = format!(
		"{}/kobo/{}/v1/books/{{ImageId}}/thumbnail/{{Width}}/{{Height}}/{{IsGreyscale}}/image.jpg",
		base_url, api_key
	);
	let quality_template = format!(
		"{}/kobo/{}/v1/books/{{ImageId}}/thumbnail/{{Width}}/{{Height}}/{{Quality}}/{{IsGreyscale}}/image.jpg",
		base_url, api_key
	);

	let mut headers = HeaderMap::new();
	// Note: i couldn't find reference to _why_ this is needed, but Komga includes the header. it should be
	// harmless, as e30= is just a base64 of "{}"
	headers.insert("x-kobo-apitoken", HeaderValue::from_static("e30="));

	Ok((
		headers,
		Json(json![{
			"Resources": {
				"image_url_quality_template": quality_template,
				"image_url_template": template,
			}
		}]),
	))
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
	HostExtractor(host): HostExtractor,
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
	headers: HeaderMap,
) -> APIResult<SyncResponse> {
	let conn = ctx.conn.as_ref();
	let user = req.user();

	let client_sync_token = headers.get("x-kobo-synctoken").and_then(|h| {
		match SyncToken::try_from_header_value(h) {
			Ok(sync_token) => Some(sync_token),
			Err(e) => {
				tracing::error!(?e, "Could not parse client's Kobo sync token");
				None
			},
		}
	});

	let device_id = headers.get("x-kobo-deviceid").and_then(|h| h.to_str().ok());
	if device_id.is_none() {
		// the device ID is not critical to the sync process, but it's useful metadata.
		tracing::warn!("Client did not pass a valid x-kobo-deviceid");
	}

	let device_metadata = device_metadata(&headers);

	let sync_page = KoboSync::next_page(
		conn,
		&user,
		device_id,
		serde_json::Value::Object(device_metadata),
		client_sync_token.as_ref(),
		ITEMS_PER_PAGE,
	)
	.await?;

	let kobo_api_base_url = format!("{}/kobo/{}", host.url(), api_key);
	let sync_items = sync_page.sync_items(kobo_api_base_url.as_str()).await?;

	// if we don't send a sync token the client will send no sync token on its next sync,
	// essentially starting the sync process from scratch. that's not a disaster, but it's
	// a weird enough case that it's simpler to error loudly.
	let sync_token = sync_page.sync_token.try_to_header_value().map_err(|e| {
		tracing::warn!(?e, "Failed to produce Kobo sync token");
		APIError::InternalServerError("Could not produce a Kobo sync token".to_string())
	})?;

	Ok(SyncResponse {
		sync_items,
		should_continue: sync_page.should_continue,
		sync_token,
	})
}

async fn book_metadata(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	HostExtractor(host): HostExtractor,
	Path(KoboAPIKeyAndBookId { api_key, book_id }): Path<KoboAPIKeyAndBookId>,
) -> APIResult<Json<Vec<BookMetadata>>> {
	let conn = ctx.conn.as_ref();
	let user = req.user();

	let m = MediaWithMetadataAndReadingSessions::find_by_id_for_user(book_id, &user)
		.into_model::<MediaWithMetadataAndReadingSessions>()
		.one(conn)
		.await?
		.ok_or(APIError::NotFound("Book not found".to_string()))?;

	let book_url = format!(
		"{}/kobo/{}/v1/books/{}/file/epub",
		host.url(),
		api_key,
		m.media.id
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
				resize_method: Some(ImageResizeMethod::FitWithin(FitWithinResize {
					width,
					height,
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
	serve_media::serve_media_file(req, headers, ctx.conn.as_ref(), book_id).await
}
