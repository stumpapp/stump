use axum::{
	body::Body,
	extract::{Path, Request, State},
	http::{header, HeaderMap, HeaderValue},
	middleware::{self, Next},
	response::{IntoResponse, Json, Response},
	routing::get,
	Extension, Router,
};
use graphql::data::AuthContext;
use models::{
	entity::media::{self, ModelWithMetadata},
	shared::{
		enums::UserPermission,
		image_processor_options::{
			ExactDimensionResize, ImageProcessorOptions, ImageResizeMethod,
			SupportedImageFormat,
		},
	},
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use stump_core::filesystem::{
	image::{GenericImageProcessor, ImageProcessor},
	ContentType,
};
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

async fn library_sync(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
	headers: HeaderMap,
) -> APIResult<impl IntoResponse> {
	let conn = ctx.conn.as_ref();
	let user = req.user();

	dbg!(headers.get("x-kobo-synctoken"));

	let items = ModelWithMetadata::find_for_user(&user)
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

	let result: Vec<SyncItem> = result.into_iter().take(5).collect();

	let mut response = Json(result).into_response();
	// response
	// 	.headers_mut()
	// 	.insert("x-kobo-sync", HeaderValue::from_static("continue"));
	// response.headers_mut().insert(
	// 	"x-kobo-synctoken",
	// 	HeaderValue::from_static("this is a random value"),
	// );
	Ok(response)
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
