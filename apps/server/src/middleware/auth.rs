use async_trait::async_trait;
use axum::{
	body::BoxBody,
	extract::FromRequestParts,
	http::{header, request::Parts, Method, StatusCode},
	response::{IntoResponse, Response},
};
use axum_sessions::SessionHandle;
use prisma_client_rust::{
	prisma_errors::query_engine::{RecordNotFound, UniqueKeyViolation},
	QueryError,
};
use stump_core::{db::models::User, prisma::user};
use tracing::{error, trace};

use crate::{
	config::state::AppState,
	utils::{decode_base64_credentials, verify_password},
};

pub struct Auth;

#[async_trait]
impl<S> FromRequestParts<S> for Auth
where
	S: Send + Sync,
{
	type Rejection = Response;

	async fn from_request_parts(
		parts: &mut Parts,
		_state: &S,
	) -> Result<Self, Self::Rejection> {
		// Note: this is fine, right? I mean, it's not like we're doing anything
		// on a OPTIONS request, right? Right? 👀
		if parts.method == Method::OPTIONS {
			return Ok(Self);
		}

		let session_handle = parts.extensions.get::<SessionHandle>().unwrap();
		let session = session_handle.read().await;

		if let Some(user) = session.get::<User>("user") {
			trace!("Session for {} already exists", &user.username);
			return Ok(Self);
		}

		// drop so we don't deadlock when writing to the session lol oy vey
		drop(session);

		// FIXME: this fails on first load, I assume I need to use the state param but not sure how yet
		// NOTE: this seems to also cause, on first load of webapp, invalid state (e.g.
		// thinking no libraries exist, etc)
		let maybe_ctx = parts.extensions.get::<AppState>();
		if maybe_ctx.is_none() {
			return Err((StatusCode::UNAUTHORIZED).into_response());
		}

		let ctx = maybe_ctx.unwrap();

		let auth_header = parts
			.headers
			.get(header::AUTHORIZATION)
			.and_then(|value| value.to_str().ok());

		let is_opds = parts.uri.path().starts_with("/opds");

		if auth_header.is_none() {
			if is_opds {
				return Err(BasicAuth.into_response());
			}

			return Err((StatusCode::UNAUTHORIZED).into_response());
		}

		let auth_header = auth_header.unwrap();

		if !auth_header.starts_with("Basic ") || auth_header.len() <= 6 {
			return Err((StatusCode::UNAUTHORIZED).into_response());
		}

		let encoded_credentials = auth_header[6..].to_string();
		let decoded_bytes = base64::decode(encoded_credentials).map_err(|e| {
			(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
		})?;
		let decoded_credentials =
			decode_base64_credentials(decoded_bytes).map_err(|e| {
				(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
			})?;

		let user = ctx
			.db
			.user()
			.find_unique(user::username::equals(decoded_credentials.username.clone()))
			.with(user::user_preferences::fetch())
			.exec()
			.await
			.map_err(|e| map_prisma_error(e).into_response())?;

		if user.is_none() {
			error!(
				"No user found for username: {}",
				&decoded_credentials.username
			);
			return Err((StatusCode::UNAUTHORIZED).into_response());
		}

		let user = user.unwrap();
		let is_match =
			verify_password(&user.hashed_password, &decoded_credentials.password)
				.map_err(|e| e.into_response())?;

		if is_match {
			trace!(
				"Basic authentication sucessful. Creating session for user: {}",
				&user.username
			);
			session_handle
				.write()
				.await
				.insert("user", user.clone())
				.map_err(|e| {
					error!("Failed to insert user into session: {}", e);
					(StatusCode::INTERNAL_SERVER_ERROR).into_response()
				})?;

			return Ok(Self);
		}

		return Err((StatusCode::UNAUTHORIZED).into_response());
	}
}

/// Middleware to check the session user is an admin. **Must** be used **after** [Auth] midddleware.
/// Refer to https://docs.rs/axum/latest/axum/middleware/index.html#ordering.
///
/// ## Example:
///
/// ```rust
/// use axum::{Router, middleware::from_extractor};
///
/// Router::new()
///     .layer(from_extractor::<AdminGuard>())
///     .layer(from_extractor::<Auth>());
/// ```
pub struct AdminGuard;

#[async_trait]
impl<S> FromRequestParts<S> for AdminGuard
where
	S: Send + Sync,
{
	type Rejection = StatusCode;

	async fn from_request_parts(
		parts: &mut Parts,
		_: &S,
	) -> Result<Self, Self::Rejection> {
		if parts.method == Method::OPTIONS {
			return Ok(Self);
		}

		let session_handle = parts.extensions.get::<SessionHandle>().unwrap();
		let session = session_handle.read().await;

		if let Some(user) = session.get::<User>("user") {
			if user.is_admin() {
				return Ok(Self);
			}

			return Err(StatusCode::FORBIDDEN);
		}

		drop(session);
		return Err(StatusCode::UNAUTHORIZED);
	}
}

pub struct BasicAuth;

impl IntoResponse for BasicAuth {
	fn into_response(self) -> Response {
		Response::builder()
			.status(StatusCode::UNAUTHORIZED)
			.header("Authorization", "Basic")
			.header("WWW-Authenticate", "Basic realm=\"stump\"")
			.body(BoxBody::default())
			.unwrap()
	}
}

fn map_prisma_error(error: QueryError) -> impl IntoResponse {
	if error.is_prisma_error::<RecordNotFound>() {
		(StatusCode::NOT_FOUND).into_response()
	} else if error.is_prisma_error::<UniqueKeyViolation>() {
		(StatusCode::UNPROCESSABLE_ENTITY).into_response()
	} else {
		(StatusCode::INTERNAL_SERVER_ERROR).into_response()
	}
}
