use axum::{
	extract::{Path, Request, State},
	middleware::{self, Next},
	response::{IntoResponse, Json, Response},
	routing::get,
	Extension, Router,
};
use graphql::data::AuthContext;
use models::{
	entity::media::{self, ModelWithMetadata},
	shared::enums::UserPermission,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::api_key_middleware,
	routers::kobo::sync_types::*,
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

/// Mounts the koreader sync router at `/kobo` (from the parent router).
/// These endpoints are not documented anywhere, but Komga's reverse-engineered
/// implementation is a decent place to start.
pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/{api_key}",
		Router::new()
			.route("/v1/library/sync", get(library_sync))
			.route("/v1/library/{book_id}/metadata", get(book_metadata))
			// The Kobo requests many routes that we don't implement.
			.route("/v1/{*path}", get(empty_json).post(empty_json))
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
	// TODO FIXME
	ctx.enforce_permissions(&[UserPermission::AccessKoreaderSync])
		.map_err(|_| {
			APIError::Forbidden("You do not have permission to use Kobo sync".to_string())
		})?;
	Ok(next.run(req).await)
}

async fn library_sync(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(KoboAPIKey { api_key, .. }): Path<KoboAPIKey>,
) -> APIResult<Json<Vec<SyncItem>>> {
	let conn = ctx.conn.as_ref();
	let _user = req.user();

	let base_url = "http://192.168.4.100:25601";

	// TODO: media::Entity::find_for_user
	let items = ModelWithMetadata::find()
		.into_model::<media::ModelWithMetadata>()
		.all(conn)
		.await?;

	let result = items
		.into_iter()
		.map(|m| {
			let book_url = format!(
				"{}/kobo/{}/v1/books/{}/file/epub",
				base_url, api_key, m.media.id
			);

			SyncItem::NewEntitlement(NewEntitlement::from_media(m, book_url))
		})
		.collect();

	Ok(Json(result))
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

	let base_url = "http://192.168.4.100:25601";

	let book_url = format!(
		"{}/kobo/{}/v1/books/{}/file/epub",
		base_url, api_key, m.media.id
	);

	let result = BookMetadata::from_media(&m, book_url);
	Ok(Json(vec![result]))
}
