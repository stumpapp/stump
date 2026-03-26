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

// TODO
const BASE_URL: &str = "http://192.168.4.100:25601";

// how many items should we send in each page of a sync response?
// this is a maximum; in some cases we may return fewer items in a page.
// TODO: select a value, or make this configurable.
const ITEMS_PER_PAGE: usize = 5;

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

	// the ID of the database KoboSync
	sync_id: String,

	// has the client retrieved all the data that was available in this session?
	// tracking this explicitly should make it easier to support paging through proxied Kobo Store
	// responses.
	completed: bool,

	// the offset of the next page that should be sent to the client.
	// this is not meaningful if complete is true.
	next_offset: usize,
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
		// TODO: filter out items that are newer than the current time.
		// otherwise there's a race.
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

	async fn continue_or_create(
		db: &DatabaseConnection,
		user: &AuthUser,
		device_id: Option<&str>,
		device_metadata: serde_json::Value,
		client_sync_token: Option<&SyncToken>,
	) -> Result<Self, sea_orm::DbErr> {
		let prev_sync = match client_sync_token {
			Some(ref t) => KoboSync::find(&db, &user, t.sync_id.clone()).await,
			None => None,
		};

		let previous_sync_began_at = prev_sync
			.as_ref()
			.map(|s| s.model.created_at.fixed_offset());

		match (
			prev_sync,
			client_sync_token.as_ref().map_or(true, |t| t.completed),
		) {
			// we're continuing an existing sync session
			(Some(prev_sync), false) => Ok(prev_sync),
			// there was no previous sync session, or the previous session completed
			(_, _) => {
				KoboSync::begin_new_sync(
					&db,
					&user,
					device_id,
					device_metadata,
					previous_sync_began_at,
				)
				.await
			},
		}
	}

	fn page_at(&self, offset: usize) -> (Vec<String>, usize, bool) {
		let len = self.model.media_ids.0.len();
		let start = offset.min(len);
		let next_offset = (offset + ITEMS_PER_PAGE).min(len);
		(
			self.model.media_ids.0[start..next_offset].to_vec(),
			next_offset,
			next_offset < self.model.media_ids.0.len(),
		)
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

	let client_sync_token = headers.get("x-kobo-synctoken").and_then(|h| {
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

	let sync_session = KoboSync::continue_or_create(
		&conn,
		&user,
		device_id,
		serde_json::Value::Object(device_metadata),
		client_sync_token.as_ref(),
	)
	.await?;

	// prev_sync = KoboSync.find_by_sync_token(client_sync_token)
	//
	// # the last page in the sync was acknowledged, or it has been too long since it was sent.
	// previous_sync_completed = prev_sync.mark_page_acknowledged(client_sync_token)
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

	let start_offset = client_sync_token.map_or(0, |t| t.next_offset);

	let (media_ids, next_offset, should_continue) = sync_session.page_at(start_offset);

	let items = ModelWithMetadata::find_by_ids_for_user(media_ids, &user)
		.filter(media::Column::Extension.eq("epub"))
		.into_model::<media::ModelWithMetadata>()
		.all(conn)
		.await?;

	let sync_items: Vec<SyncItem> = items
		.into_iter()
		.map(|m| {
			let book_url = format!(
				"{}/kobo/{}/v1/books/{}/file/epub",
				BASE_URL, api_key, m.media.id
			);

			SyncItem::NewEntitlement(NewEntitlement::from_media(m, book_url))
		})
		.collect();

	Ok(SyncResponse {
		sync_items: sync_items,
		should_continue: should_continue,
		sync_token: SyncToken {
			version: 1,
			sync_id: sync_session.model.id,
			completed: !should_continue,
			next_offset: next_offset,
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

#[cfg(test)]
mod tests {

	use models::{
		entity::{
			kobo_sync, library_exclusion, media, media_metadata, series, series_metadata,
			user, user_preferences,
		},
		shared::enums::{FileStatus, UserPermission},
	};
	use sea_orm::{
		prelude::DateTimeWithTimeZone, ActiveModelTrait, ActiveValue, ConnectionTrait,
		Database, DbBackend, DbConn, DbErr, Schema,
	};
	use uuid::Uuid;

	use crate::routers::kobo::sync::KoboSync;

	async fn setup_schema(db: &DbConn) -> Result<(), DbErr> {
		// Setup Schema helper
		let schema = Schema::new(DbBackend::Sqlite);

		let tables = [
			schema.create_table_from_entity(media::Entity),
			schema.create_table_from_entity(media_metadata::Entity),
			schema.create_table_from_entity(series::Entity),
			schema.create_table_from_entity(series_metadata::Entity),
			schema.create_table_from_entity(library_exclusion::Entity),
			schema.create_table_from_entity(kobo_sync::Entity),
			schema.create_table_from_entity(user::Entity),
			schema.create_table_from_entity(user_preferences::Entity),
		];

		for stmt in tables {
			// Execute create table statement
			db.execute(db.get_database_backend().build(&stmt)).await?;
		}

		Ok(())
	}

	// note that None here means "use some default", not necessarily "set the value to None".
	// that may make it impossible to set some values to None. I'm not sure how to avoid that while
	// keeping good ergonomics.
	#[derive(Default)]
	struct ExampleMedia {
		id: Option<String>,
		name: Option<String>,
		extension: Option<String>,
		created_at: Option<DateTimeWithTimeZone>,
		modified_at: Option<DateTimeWithTimeZone>,
		deleted_at: Option<DateTimeWithTimeZone>,
	}

	impl ExampleMedia {
		async fn insert(&self, db: &DbConn) -> media::Model {
			let id = self
				.id
				.clone()
				.unwrap_or_else(|| Uuid::new_v4().to_string());

			let name = self
				.name
				.clone()
				.unwrap_or_else(|| format!("Test Book {id}"));
			let extension = self.extension.clone().unwrap_or("epub".to_string());

			let model = media::ActiveModel {
				id: ActiveValue::Set(id.clone()),
				name: ActiveValue::Set(name.clone()),
				size: ActiveValue::Set(1234),
				extension: sea_orm::Set(extension.clone()),
				pages: ActiveValue::Set(940),
				modified_at: self
					.modified_at
					.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
				deleted_at: self
					.deleted_at
					.map_or(ActiveValue::default(), |t| ActiveValue::Set(Some(t))),
				path: sea_orm::Set(format!("{name}.{extension}").to_string()),
				status: sea_orm::Set(FileStatus::Ready),
				..Default::default()
			};

			let insert_result = model.insert(db).await.expect("could not insert media");

			// "created_at" is overridden by the ActiveModelBehavior, so we need to update it explicitly.
			match self.created_at {
				Some(t) => {
					let mut model: media::ActiveModel = insert_result.into();
					model.created_at = ActiveValue::Set(t);
					model.update(db).await.expect("could not update media")
				},
				None => insert_result,
			}
		}
	}

	#[derive(Default)]
	struct ExampleUser {}

	impl ExampleUser {
		async fn insert(&self, db: &DbConn) -> user::Model {
			let model = user::ActiveModel {
				username: sea_orm::Set("example".to_string()), // TODO: allow setting, or generate
				hashed_password: sea_orm::Set("example".to_string()), // TODO: allow setting, or generate
				is_server_owner: sea_orm::Set(true),
				is_locked: sea_orm::Set(false),
				..Default::default()
			};

			model.insert(db).await.expect("could not insert user")
		}
	}

	#[tokio::test]
	async fn test_first_sync() {
		let db = Database::connect("sqlite::memory:")
			.await
			.expect("failed to connect to test database");

		// Setup database schema
		setup_schema(&db)
			.await
			.expect("failed to create test database tables");

		ExampleMedia {
			id: Some("don-quixote".to_string()),
			name: Some("Don Quixote".to_string()),
			created_at: Some("1605-01-16T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		ExampleMedia {
			id: Some("robinson-crusoe".to_string()),
			name: Some("Robinson Crusoe".to_string()),
			created_at: Some("1719-04-25T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		ExampleMedia {
			id: Some("the-count-of-monte-cristo".to_string()),
			name: Some("The Count of Monte Cristo".to_string()),
			created_at: Some("1846-01-15T00:00:00Z".parse().unwrap()),
			..Default::default()
		}
		.insert(&db)
		.await;

		let user = ExampleUser {}.insert(&db).await;

		let user = user::AuthUser {
			id: user.id,
			permissions: vec![UserPermission::AccessBookClub],
			..Default::default()
		};
		let sync = KoboSync::continue_or_create(
			&db,
			&user,
			Some("kobo-1"),
			serde_json::json!({}),
			None,
		)
		.await
		.expect("failed to initiate sync");

		assert_eq!(
			vec![
				"don-quixote",
				"robinson-crusoe",
				"the-count-of-monte-cristo"
			],
			sync.model.media_ids.0
		);

		// TODO: test ignoring non-epubs
	}
}
