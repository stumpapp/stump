use async_trait::async_trait;
use axum::{
	body::BoxBody,
	extract::{FromRef, FromRequestParts, OriginalUri},
	http::{header, request::Parts, Method, StatusCode},
	response::{IntoResponse, Redirect, Response},
	Json,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use prisma_client_rust::{
	chrono::Utc,
	prisma_errors::query_engine::{RecordNotFound, UniqueKeyViolation},
	QueryError,
};
use stump_core::{
	db::entity::{User, UserPermission},
	opds::v2_0::{
		authentication::{
			OPDSAuthenticationDocumentBuilder, OPDSSupportedAuthFlow,
			OPDS_AUTHENTICATION_DOCUMENT_REL, OPDS_AUTHENTICATION_DOCUMENT_TYPE,
		},
		link::OPDSLink,
	},
	prisma::{session, user, PrismaClient},
};
use tower_sessions::Session;

use crate::{
	config::{session::SESSION_USER_KEY, state::AppState},
	errors::APIError,
	routers::{enforce_max_sessions, relative_favicon_path},
	utils::{decode_base64_credentials, verify_password},
};

use super::host::HostExtractor;

pub struct Auth;

// TODO: Change Response to APIResultResponse
// TODO: create a new extractor like UserExtractor which supports both session auth and future alternative auth methods (e.g. JWT)

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

		let host_details = HostExtractor::from_request_parts(parts, state)
			.await
			.map_err(|e| {
				tracing::error!("Failed to extract host: {}", e);
				(StatusCode::INTERNAL_SERVER_ERROR).into_response()
			})?
			.0;

		let state = AppState::from_ref(state);

		let session = Session::from_request_parts(parts, &state)
			.await
			.map_err(|e| {
				tracing::error!("Failed to extract session handle: {}", e.1);
				(StatusCode::INTERNAL_SERVER_ERROR).into_response()
			})?;

		let session_user = session.get::<User>(SESSION_USER_KEY).map_err(|e| {
			tracing::error!(error = ?e, "Failed to get user from session");
			(StatusCode::INTERNAL_SERVER_ERROR).into_response()
		})?;

		if let Some(user) = session_user {
			if !user.is_locked {
				tracing::trace!(user = user.username, "Session found!");
				return Ok(Self);
			}
		} else {
			tracing::trace!("No existing session found");
		}

		let request_uri =
			if let Ok(path) = OriginalUri::from_request_parts(parts, &state).await {
				path.0.path().to_owned()
			} else {
				parts.uri.path().to_owned()
			};
		let is_opds = request_uri.starts_with("/opds");
		let is_swagger = request_uri.starts_with("/swagger-ui");

		let auth_header = parts
			.headers
			.get(header::AUTHORIZATION)
			.and_then(|value| value.to_str().ok());
		let has_auth_header = auth_header.is_some();

		tracing::trace!(is_opds, has_auth_header, uri = ?parts.uri, "Checking auth header");

		let Some(auth_header) = auth_header else {
			if is_opds {
				let opds_version = request_uri
					.split('/')
					.nth(2)
					.map(|v| v.replace('v', ""))
					.unwrap_or("1.2".to_string());

				return Err(
					OPDSBasicAuth::new(opds_version, host_details.url()).into_response()
				);
			} else if is_swagger {
				// Sign in via React app and then redirect to server-side swagger-ui
				return Err(Redirect::to("/auth?redirect=%2Fswagger-ui/").into_response());
			}

			return Err((StatusCode::UNAUTHORIZED).into_response());
		};

		if auth_header.starts_with("Bearer ") && auth_header.len() > 7 {
			let token = auth_header[7..].to_owned();
			return handle_bearer_auth(token).await;
		} else if auth_header.starts_with("Basic ") && auth_header.len() > 6 {
			let encoded_credentials = auth_header[6..].to_owned();
			return handle_basic_auth(encoded_credentials, &state.db, session).await;
		}

		return Err((StatusCode::UNAUTHORIZED).into_response());
	}
}

// TODO: https://github.com/stumpapp/stump/issues/219
async fn handle_bearer_auth(_: String) -> Result<Auth, Response> {
	Err((StatusCode::NOT_IMPLEMENTED).into_response())
}

async fn handle_basic_auth(
	encoded_credentials: String,
	client: &PrismaClient,
	session: Session,
) -> Result<Auth, Response> {
	let decoded_bytes = STANDARD
		.decode(encoded_credentials.as_bytes())
		.map_err(|e| {
			(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
		})?;
	let decoded_credentials = decode_base64_credentials(decoded_bytes).map_err(|e| {
		(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
	})?;

	let fetched_user = client
		.user()
		.find_unique(user::username::equals(decoded_credentials.username.clone()))
		.with(user::user_preferences::fetch())
		.with(user::age_restriction::fetch())
		.with(user::sessions::fetch(vec![session::expires_at::gt(
			Utc::now().into(),
		)]))
		.exec()
		.await
		.map_err(|e| map_prisma_error(e).into_response())?;

	let Some(user) = fetched_user else {
		tracing::error!(
			"No user found for username: {}",
			&decoded_credentials.username
		);
		return Err((StatusCode::UNAUTHORIZED).into_response());
	};

	let is_match = verify_password(&user.hashed_password, &decoded_credentials.password)
		.map_err(|e| e.into_response())?;

	// TODO: restrict session count here
	if is_match && user.is_locked {
		tracing::error!(
			username = &user.username,
			"User is locked, denying authentication"
		);
		return Err((StatusCode::UNAUTHORIZED, "Your account is locked. Please contact an administrator to unlock your account.").into_response());
	} else if is_match {
		tracing::trace!(
			username = &user.username,
			"Basic authentication sucessful. Creating session for user"
		);
		enforce_max_sessions(&user, client).await.map_err(|e| {
			tracing::error!("Failed to enforce max sessions: {}", e);
			(StatusCode::INTERNAL_SERVER_ERROR).into_response()
		})?;
		let user = User::from(user);
		session.insert(SESSION_USER_KEY, user).map_err(|e| {
			tracing::error!("Failed to insert user into session: {}", e);
			(StatusCode::INTERNAL_SERVER_ERROR).into_response()
		})?;

		return Ok(Auth);
	}

	Err((StatusCode::UNAUTHORIZED).into_response())
}

/// Middleware to check the session user is an admin. **Must** be used **after** [Auth] midddleware.
/// Refer to https://docs.rs/axum/latest/axum/middleware/index.html#ordering.
///
/// ## Example:
///
/// ```rust
/// use axum::{Router, middleware::{from_extractor, from_extractor_with_state}};
/// use stump_core::{Ctx, config::StumpConfig};
/// use stump_server::{
///     middleware::auth::{Auth, ServerOwnerGuard},
///     config::state::AppState
/// };
///
/// #[tokio::main]
/// async fn main() {
///     let config = StumpConfig::debug();
///     let ctx = Ctx::new(config).await.arced();
///
///     let router: Router<AppState> = Router::new()
///         .layer(from_extractor::<ServerOwnerGuard>())
///         .layer(from_extractor_with_state::<Auth, AppState>(ctx));
/// }
/// ```
pub struct ServerOwnerGuard;

#[async_trait]
impl<S> FromRequestParts<S> for ServerOwnerGuard
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
			if user.is_server_owner {
				return Ok(Self);
			}

			return Err(StatusCode::FORBIDDEN);
		}

		return Err(StatusCode::UNAUTHORIZED);
	}
}

pub struct OPDSBasicAuth {
	version: String,
	service_url: String,
}

impl OPDSBasicAuth {
	pub fn new(version: String, service_url: String) -> Self {
		Self {
			version,
			service_url,
		}
	}
}

impl IntoResponse for OPDSBasicAuth {
	fn into_response(self) -> Response {
		if self.version == "2.0" {
			let document = match OPDSAuthenticationDocumentBuilder::default()
				.description(OPDSSupportedAuthFlow::Basic.description().to_string())
				.links(vec![
					OPDSLink::help(),
					OPDSLink::logo(format!(
						"{}{}",
						self.service_url,
						relative_favicon_path()
					)),
				])
				.build()
			{
				Ok(document) => document,
				Err(e) => {
					tracing::error!(error = ?e, "Failed to build OPDS authentication document");
					return APIError::InternalServerError(e.to_string()).into_response();
				},
			};
			let json_repsonse = Json(document).into_response();
			let body = json_repsonse.into_body();
			let body = BoxBody::from(body);

			// TODO: determine if relative paths work...
			Response::builder()
				.status(StatusCode::UNAUTHORIZED)
				.header("Authorization", "Basic")
				.header(
					"WWW-Authenticate",
					format!("Basic realm=\"stump OPDS v{}\"", self.version),
				)
				.header(
					"Content-Type",
					format!("{OPDS_AUTHENTICATION_DOCUMENT_TYPE}; charset=utf-8"),
				)
				.header(
					"Link",
					format!(
						"<{}{}>; rel=\"{OPDS_AUTHENTICATION_DOCUMENT_REL}\"; type=\"{OPDS_AUTHENTICATION_DOCUMENT_TYPE}\"",
						self.service_url,
						"/opds/v2.0/auth"
					),
				)
				.body(body)
				.unwrap_or_else(|e| {
					tracing::error!(error = ?e, "Failed to build response");
					StatusCode::INTERNAL_SERVER_ERROR.into_response()
				})
		} else {
			Response::builder()
				.status(StatusCode::UNAUTHORIZED)
				.header("Authorization", "Basic")
				.header(
					"WWW-Authenticate",
					format!("Basic realm=\"stump OPDS v{}\"", self.version),
				)
				.body(BoxBody::default())
				.unwrap_or_else(|e| {
					tracing::error!(error = ?e, "Failed to build response");
					APIError::InternalServerError(e.to_string()).into_response()
				})
		}
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
			.unwrap_or_else(|e| {
				tracing::error!(error = ?e, "Failed to build response");
				StatusCode::INTERNAL_SERVER_ERROR.into_response()
			})
	}
}

pub struct BookClubGuard;

#[async_trait]
impl<S> FromRequestParts<S> for BookClubGuard
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
			if user.has_permission(UserPermission::AccessBookClub) {
				return Ok(Self);
			}

			return Err(StatusCode::FORBIDDEN);
		}

		return Err(StatusCode::UNAUTHORIZED);
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

// TODO(281): Add tests for file
