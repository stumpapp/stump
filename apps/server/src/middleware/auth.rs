use async_trait::async_trait;
use axum::{
	body::BoxBody,
	extract::{FromRef, FromRequestParts},
	http::{header, request::Parts, Method, StatusCode},
	response::{IntoResponse, Redirect, Response},
};
use prisma_client_rust::{
	prisma_errors::query_engine::{RecordNotFound, UniqueKeyViolation},
	QueryError,
};
use stump_core::{db::entity::User, prisma::user};
use tower_sessions::Session;
use tracing::{error, trace};

use crate::{
	config::{session::SESSION_USER_KEY, state::AppState},
	utils::{decode_base64_credentials, verify_password},
};

pub struct Auth;

#[async_trait]
impl<S> FromRequestParts<S> for Auth
where
	AppState: FromRef<S>,
	S: Send + Sync,
{
	type Rejection = Response;

	async fn from_request_parts(
		parts: &mut Parts,
		state: &S,
	) -> Result<Self, Self::Rejection> {
		// Note: this is fine, right? I mean, it's not like we're doing anything
		// on a OPTIONS request, right? Right? 👀
		if parts.method == Method::OPTIONS {
			return Ok(Self);
		}

		let state = AppState::from_ref(state);

		let session = Session::from_request_parts(parts, &state)
			.await
			.map_err(|e| {
				error!("Failed to extract session handle: {}", e.1);
				(StatusCode::INTERNAL_SERVER_ERROR).into_response()
			})?;

		let session_user = session.get::<User>(SESSION_USER_KEY).map_err(|e| {
			tracing::error!(error = ?e, "Failed to get user from session");
			(StatusCode::INTERNAL_SERVER_ERROR).into_response()
		})?;
		if let Some(user) = session_user {
			trace!("Session for {} already exists", &user.username);
			return Ok(Self);
		}

		let auth_header = parts
			.headers
			.get(header::AUTHORIZATION)
			.and_then(|value| value.to_str().ok());

		let is_opds = parts.uri.path().starts_with("/opds");
		let is_swagger = parts.uri.path().starts_with("/swagger-ui");
		let has_auth_header = auth_header.is_some();
		trace!(is_opds, has_auth_header, uri = ?parts.uri, "Checking auth header");

		if !has_auth_header {
			if is_opds {
				return Err(BasicAuth.into_response());
			} else if is_swagger {
				return Err(Redirect::to("/auth?redirect=%2Fswagger-ui/").into_response());
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

		let user = state
			.db
			.user()
			.find_unique(user::username::equals(decoded_credentials.username.clone()))
			.with(user::user_preferences::fetch())
			.with(user::age_restriction::fetch())
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
				username = &user.username,
				"Basic authentication sucessful. Creating session for user"
			);
			session
				.insert(SESSION_USER_KEY, user.clone())
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
///     .layer(from_extractor_with_state::<Auth, AppState>(app_state));
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

		let session = parts
			.extensions
			.get::<Session>()
			.expect("Failed to extract session");

		let session_user = session.get::<User>(SESSION_USER_KEY).map_err(|e| {
			tracing::error!(error = ?e, "Failed to get user from session");
			StatusCode::INTERNAL_SERVER_ERROR
		})?;
		if let Some(user) = session_user {
			if user.is_admin() {
				return Ok(Self);
			}

			return Err(StatusCode::FORBIDDEN);
		}

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
