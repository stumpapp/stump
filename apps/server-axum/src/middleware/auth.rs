use std::sync::Arc;

use async_trait::async_trait;
use axum::{
	body::BoxBody,
	extract::{FromRequest, RequestParts},
	http::{header, StatusCode},
	response::{IntoResponse, Response},
};
use axum_sessions::SessionHandle;
use prisma_client_rust::{
	prisma_errors::query_engine::{RecordNotFound, UniqueKeyViolation},
	QueryError,
};
use stump_core::{config::Ctx, prisma::user, types::User};
use tracing::{error, trace};

use crate::utils::{check_password, decode_base64_credentials};

pub struct Auth;

#[async_trait]
impl<B> FromRequest<B> for Auth
where
	B: Send,
{
	type Rejection = Response;

	async fn from_request(req: &mut RequestParts<B>) -> Result<Self, Self::Rejection> {
		let session_handle = req.extensions().get::<SessionHandle>().unwrap();
		let session = session_handle.read().await;

		if let Some(user) = session.get::<User>("user") {
			trace!("Session for {} already exists", &user.username);
			return Ok(Self);
		}

		// drop so we don't deadlock when writing to the session lol oy vey
		drop(session);

		let ctx = req.extensions().get::<Arc<Ctx>>().unwrap();

		let auth_header = req
			.headers()
			.get(header::AUTHORIZATION)
			.and_then(|value| value.to_str().ok());

		let is_opds = req.uri().path().starts_with("/opds");

		if auth_header.is_none() {
			if is_opds {
				return Err(BasicAuthRequired.into_response());
			}

			return Err((StatusCode::UNAUTHORIZED).into_response());
		}

		let auth_header = auth_header.unwrap();
		let encoded_credentials: String;

		if auth_header.starts_with("Basic ") && auth_header.len() > 6 {
			encoded_credentials = auth_header[6..].to_string();
		} else {
			return Err((StatusCode::UNAUTHORIZED).into_response());
		}

		let decoded_bytes = base64::decode(encoded_credentials)
			.map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR).into_response())?;

		let decoded_credentials = decode_base64_credentials(decoded_bytes)
			.map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR).into_response())?;

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
			check_password(&user.hashed_password, &decoded_credentials.password)
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

pub struct BasicAuthRequired;

impl IntoResponse for BasicAuthRequired {
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
