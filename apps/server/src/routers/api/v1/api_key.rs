use axum::{
	extract::{Path, Request, State},
	http::HeaderMap,
	middleware::{self, Next},
	response::{Json, Response},
	routing::{get, post},
	Extension, Router,
};
use chrono::{DateTime, FixedOffset};
use prefixed_api_key::PrefixedApiKey;
use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::{
	db::entity::{APIKey, APIKeyPermissions, UserPermission},
	prisma::{api_key, user},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, validate_api_key, AuthContext},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/api-keys",
			Router::new()
				.route("/", get(get_api_keys).post(create_api_key))
				.route("/validate-key", post(validate_api_key_handler))
				.route(
					"/{id}",
					get(get_api_key).put(update_api_key).delete(delete_api_key),
				)
				.route("/{id}/regenerate-secret", post(regenerate_api_key_secret)),
		)
		.layer(middleware::from_fn(authorize)) // Note the order!
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

/// A secondary authorization middleware to ensure that the user has access to the
/// API key management endpoints. This is purely for convenience
async fn authorize(req: Request, next: Next) -> APIResult<Response> {
	let ctx = req
		.extensions()
		.get::<AuthContext>()
		.ok_or(APIError::Unauthorized)?;
	ctx.enforce_permissions(&[UserPermission::AccessAPIKeys])?;
	Ok(next.run(req).await)
}

/// Get all API keys for the current user
async fn get_api_keys(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Vec<APIKey>>> {
	let user = req.user();
	let client = &ctx.db;

	let api_keys = client
		.api_key()
		.find_many(vec![api_key::user_id::equals(user.id.clone())])
		.exec()
		.await?;
	let api_keys = api_keys
		.into_iter()
		.map(APIKey::try_from)
		.collect::<Result<Vec<APIKey>, _>>()?;

	Ok(Json(api_keys))
}

/// Get a single API key for the current user
async fn get_api_key(
	Path(id): Path<i32>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<APIKey>> {
	let user = req.user();
	let client = &ctx.db;

	let api_key = client
		.api_key()
		.find_first(vec![
			api_key::id::equals(id),
			api_key::user_id::equals(user.id.clone()),
		])
		.exec()
		.await?;
	let api_key = api_key.ok_or(APIError::NotFound("API key not found".to_string()))?;

	Ok(Json(APIKey::try_from(api_key)?))
}

// TODO: perhaps a more meaningful response when it is valid?
async fn validate_api_key_handler(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	headers: HeaderMap,
) -> APIResult<Json<bool>> {
	let api_key = headers
		.get("x-api-key")
		.ok_or_else(|| APIError::BadRequest("Missing API key in headers".to_string()))?;
	let api_key = api_key
		.to_str()
		.map_err(|_| APIError::BadRequest("Invalid API key in headers".to_string()))?;
	let pak = PrefixedApiKey::from_string(api_key)
		.map_err(|_| APIError::BadRequest("Invalid API key in headers".to_string()))?;

	let is_valid = match validate_api_key(pak, &ctx.db).await {
		Ok(key_user) => key_user.is(req.user()),
		// We swallow errors to avoid showing our hand a bit, i.e. if the key wasn't found
		// or is expired etc that is not surfaced. This is a bit of a tradeoff since it might
		// not be overly useful, but it is a little more secure.
		Err(_) => false,
	};

	Ok(Json(is_valid))
}

/// The request body for creating or updating an API key
#[derive(Deserialize, Type)]
pub struct CreateOrUpdateAPIKey {
	/// The name of the API key
	name: String,
	/// The permissions that the API key should have
	permissions: APIKeyPermissions,
	/// The expiration date for the API key, if any
	#[specta(optional)]
	expires_at: Option<DateTime<FixedOffset>>,
}

/// The response after creating a new API key
#[derive(Serialize, Type)]
pub struct CreatedAPIKey {
	/// The fully qualified prefixed API key. This is what the user will provide to
	/// authenticate and authorize requests. This **is not** stored in the database,
	/// so it may only be retrieved once upon creation.
	api_key: String,
}

/// Create a new API key for the current user
async fn create_api_key(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(body): Json<CreateOrUpdateAPIKey>,
) -> APIResult<Json<CreatedAPIKey>> {
	let user = req.user();
	let client = &ctx.db;

	if let APIKeyPermissions::Custom(permissions) = &body.permissions {
		// Ensure that the user has the requested permissions
		req.enforce_permissions(permissions).map_err(|e| {
			tracing::error!(?e, "User does not have requested permissions");
			APIError::Forbidden("You lack the required permissions".to_string())
		})?;
	};

	let permissions = serde_json::to_vec(&body.permissions).map_err(|e| {
		tracing::error!(?e, "Failed to serialize permissions");
		APIError::BadRequest("Invalid permissions requested".to_string())
	})?;

	let (pek, hash) = APIKey::create_prefixed_key()?;
	let _api_key = client
		.api_key()
		.create(
			body.name,
			pek.short_token().to_string(),
			hash,
			permissions,
			user::id::equals(user.id.clone()),
			vec![api_key::expires_at::set(body.expires_at)],
		)
		.exec()
		.await?;

	Ok(Json(CreatedAPIKey {
		api_key: pek.to_string(),
	}))
}

/// Update an existing API key for the current user
async fn update_api_key(
	Path(id): Path<i32>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Json(body): Json<CreateOrUpdateAPIKey>,
) -> APIResult<Json<APIKey>> {
	let user = req.user();
	let client = &ctx.db;

	let api_key = client
		.api_key()
		.find_first(vec![
			api_key::id::equals(id),
			api_key::user_id::equals(user.id.clone()),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound("API key not found".to_string()))?;

	if let APIKeyPermissions::Custom(permissions) = &body.permissions {
		// Ensure that the user has the requested permissions
		req.enforce_permissions(permissions).map_err(|e| {
			tracing::error!(?e, "User does not have requested permissions");
			APIError::Forbidden("You lack the required permissions".to_string())
		})?;
	};

	let permissions = serde_json::to_vec(&body.permissions).map_err(|e| {
		tracing::error!(?e, "Failed to serialize permissions");
		APIError::BadRequest("Invalid permissions requested".to_string())
	})?;

	let updated_api_key = client
		.api_key()
		.update(
			api_key::id::equals(api_key.id),
			vec![
				api_key::name::set(body.name),
				api_key::permissions::set(permissions),
				api_key::expires_at::set(body.expires_at),
			],
		)
		.exec()
		.await?;

	Ok(Json(APIKey::try_from(updated_api_key)?))
}

/// Delete an existing API key for the current user
async fn delete_api_key(
	Path(id): Path<i32>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<()> {
	let user = req.user();
	let client = &ctx.db;

	let api_key = client
		.api_key()
		.find_first(vec![
			api_key::id::equals(id),
			api_key::user_id::equals(user.id.clone()),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound("API key not found".to_string()))?;

	let _deleted_key = client
		.api_key()
		.delete(api_key::id::equals(api_key.id))
		.exec()
		.await?;

	Ok(())
}

/// Regenerate the secret for an existing API key. This will fully invalidate the
/// existing pek and hash and create a new one.
async fn regenerate_api_key_secret(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	Path(id): Path<i32>,
) -> APIResult<Json<CreatedAPIKey>> {
	let user = req.user();
	let client = &ctx.db;

	let api_key = client
		.api_key()
		.find_first(vec![
			api_key::id::equals(id),
			api_key::user_id::equals(user.id.clone()),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound("API key not found".to_string()))?;

	let (pek, hash) = APIKey::create_prefixed_key()?;
	let _updated_key = client
		.api_key()
		.update(
			api_key::id::equals(api_key.id),
			vec![
				api_key::short_token::set(pek.short_token().to_string()),
				api_key::long_token_hash::set(hash),
			],
		)
		.exec()
		.await?;

	Ok(Json(CreatedAPIKey {
		api_key: pek.to_string(),
	}))
}
