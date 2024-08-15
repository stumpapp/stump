use async_trait::async_trait;
use axum::{
	body::Body,
	extract::{FromRequestParts, OriginalUri, Request, State},
	http::{header, request::Parts, Method, StatusCode},
	middleware::Next,
	response::{IntoResponse, Redirect, Response},
};
use base64::{engine::general_purpose::STANDARD, Engine};
use stump_core::{
	db::entity::{User, UserPermission},
	prisma::{user, PrismaClient},
};
use tower_sessions::Session;

use crate::{
	config::{jwt::verify_user_jwt, session::SESSION_USER_KEY, state::AppState},
	errors::{api_error_message, APIError, APIResult},
	routers::enforce_max_sessions,
	utils::{
		decode_base64_credentials, get_session_user, user_has_all_permissions,
		verify_password,
	},
};

// TODO(axum-upgrade): Rename to RequestContext? RequestCtx? RequestUser? AuthenticatedRequest?
/// A struct to represent the authenticated user in the current request context. A user is
/// authenticated if they meet one of the following criteria:
/// - They have a valid session
/// - They have a valid bearer token (session is not created)
/// - They have valid basic auth credentials (session is created)
#[derive(Debug, Clone)]
pub struct RequestContext(User);

impl RequestContext {
	/// Get a reference to the current user
	pub fn user(&self) -> &User {
		&self.0
	}

	/// Get the ID of the current user
	pub fn id(&self) -> String {
		self.0.id.clone()
	}

	/// Enforce that the current user has all the permissions provided, otherwise return an error
	#[tracing::instrument(skip(self))]
	pub fn enforce_permissions(&self, permissions: &[UserPermission]) -> APIResult<()> {
		let user = self.user();

		if user.is_server_owner {
			return Ok(());
		}

		if user.is_locked {
			return Err(APIError::Forbidden(
				api_error_message::LOCKED_ACCOUNT.to_string(),
			));
		}

		if user_has_all_permissions(user, permissions) {
			Ok(())
		} else {
			Err(APIError::Forbidden(
				api_error_message::FORBIDDEN_ACTION.to_string(),
			))
		}
	}

	/// Get the current user and enforce that they have all the permissions provided, otherwise
	/// return an error
	pub fn user_and_enforce_permissions(
		&self,
		permissions: &[UserPermission],
	) -> APIResult<User> {
		self.enforce_permissions(permissions)?;
		Ok(self.user().clone())
	}

	pub fn enforce_server_owner(&self) -> APIResult<()> {
		let user = self.user();

		if user.is_server_owner {
			Ok(())
		} else {
			Err(APIError::Forbidden(
				api_error_message::FORBIDDEN_ACTION.to_string(),
			))
		}
	}

	pub fn server_owner_user(&self) -> APIResult<User> {
		self.enforce_server_owner()?;
		Ok(self.user().clone())
	}
}

/// Middleware to check if a user is authenticated. If the user is not authenticated, the middleware
/// will reject authentication. If the user is authenticated, the middleware will insert the user
/// into the request extensions.
#[tracing::instrument(skip(ctx, req, next))]
pub async fn auth_middleware(
	State(ctx): State<AppState>,
	mut req: Request,
	next: Next,
) -> Result<Response, impl IntoResponse> {
	let req_headers = req.headers().clone();
	let auth_header = req_headers
		.get(header::AUTHORIZATION)
		.and_then(|header| header.to_str().ok());

	let request_uri = if let Some(path) = req.extensions().get::<OriginalUri>() {
		path.0.path().to_owned()
	} else {
		req.uri().path().to_owned()
	};

	let Some(session) = req.extensions_mut().get_mut::<Session>() else {
		return Err(APIError::InternalServerError(String::from(
			"Failed to extract session handle",
		))
		.into_response());
	};

	let session_user = get_session_user(&session).await.map_err(|e| {
		tracing::error!(error = ?e, "Failed to get user from session");
		APIError::Unauthorized.into_response()
	})?;

	if let Some(user) = session_user {
		if !user.is_locked {
			req.extensions_mut().insert(RequestContext(user));
			return Ok(next.run(req).await);
		}
	}

	let is_opds = request_uri.starts_with("/opds");
	let is_swagger = request_uri.starts_with("/swagger-ui");

	let Some(auth_header) = auth_header else {
		if is_opds {
			// Prompt for basic auth on OPDS routes
			return Err(BasicAuth.into_response());
		} else if is_swagger {
			// Sign in via React app and then redirect to server-side swagger-ui
			return Err(Redirect::to("/auth?redirect=%2Fswagger-ui/").into_response());
		}

		return Err(APIError::Unauthorized.into_response());
	};

	let user = match auth_header {
		_ if auth_header.starts_with("Bearer ") && auth_header.len() > 7 => {
			let token = auth_header[7..].to_owned();
			handle_bearer_auth_new(token, &ctx.db)
				.await
				.map_err(|e| e.into_response())?
		},
		_ if auth_header.starts_with("Basic ") && auth_header.len() > 6 => {
			let encoded_credentials = auth_header[6..].to_owned();
			handle_basic_auth_new(encoded_credentials, &ctx.db, session)
				.await
				.map_err(|e| e.into_response())?
		},
		_ => return Err(APIError::Unauthorized.into_response()),
	};

	req.extensions_mut().insert(RequestContext(user));

	Ok(next.run(req).await)
}

#[tracing::instrument(skip_all)]
async fn handle_bearer_auth_new(token: String, client: &PrismaClient) -> APIResult<User> {
	let user_id = verify_user_jwt(&token)?;

	let fetched_user = client
		.user()
		.find_unique(user::id::equals(user_id.clone()))
		.with(user::user_preferences::fetch())
		.with(user::age_restriction::fetch())
		.exec()
		.await?;

	let Some(user) = fetched_user else {
		tracing::error!(?user_id, "No user found for ID");
		return Err(APIError::Unauthorized);
	};

	if user.is_locked {
		tracing::error!(
			username = &user.username,
			"User is locked, denying authentication"
		);
		return Err(APIError::Forbidden(
			api_error_message::LOCKED_ACCOUNT.to_string(),
		));
	}

	Ok(User::from(user))
}

#[tracing::instrument(skip_all)]
async fn handle_basic_auth_new(
	encoded_credentials: String,
	client: &PrismaClient,
	session: &mut Session,
) -> APIResult<User> {
	let decoded_bytes = STANDARD
		.decode(encoded_credentials.as_bytes())
		.map_err(|e| APIError::InternalServerError(e.to_string()))?;
	let decoded_credentials = decode_base64_credentials(decoded_bytes)?;

	let fetched_user = client
		.user()
		.find_unique(user::username::equals(decoded_credentials.username.clone()))
		.with(user::user_preferences::fetch())
		.with(user::age_restriction::fetch())
		.exec()
		.await?;

	let Some(user) = fetched_user else {
		tracing::error!(
			"No user found for username: {}",
			&decoded_credentials.username
		);
		return Err(APIError::Unauthorized);
	};

	let is_match = verify_password(&user.hashed_password, &decoded_credentials.password)?;

	if is_match && user.is_locked {
		tracing::error!(
			username = &user.username,
			"User is locked, denying authentication"
		);
		return Err(APIError::Forbidden(
			api_error_message::LOCKED_ACCOUNT.to_string(),
		));
	} else if is_match {
		tracing::trace!(
			username = &user.username,
			"Basic authentication sucessful. Creating session for user"
		);
		enforce_max_sessions(&user, client).await?;
		let user = User::from(user);
		session.insert(SESSION_USER_KEY, user.clone()).await?;
		return Ok(user);
	}

	Err(APIError::Unauthorized)
}

/// Middleware to check the session user is an admin. **Must** be used **after** [Auth] midddleware.
/// Refer to https://docs.rs/axum/latest/axum/middleware/index.html#ordering.
///
/// ## Example:
///
/// ```rust
/// use axum::{Router, middleware::{from_extractor, self}};
/// use stump_core::{Ctx, config::StumpConfig};
/// use stump_server::{
///     middleware::auth::{auth_middleware, ServerOwnerGuard},
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
///         .layer(middleware::from_fn_with_state(ctx, auth_middleware))
/// }
/// ```
pub struct ServerOwnerGuard;

#[async_trait]
impl<S> FromRequestParts<S> for ServerOwnerGuard
where
	S: Send + Sync,
{
	type Rejection = Response;

	async fn from_request_parts(
		parts: &mut Parts,
		_: &S,
	) -> Result<Self, Self::Rejection> {
		if parts.method == Method::OPTIONS {
			return Ok(Self);
		}

		let req_context = parts
			.extensions
			.get::<RequestContext>()
			.ok_or_else(|| APIError::Unauthorized.into_response())?;

		req_context
			.enforce_server_owner()
			.map_err(|e| e.into_response())?;

		Ok(Self)
	}
}

pub struct BasicAuth;

impl IntoResponse for BasicAuth {
	fn into_response(self) -> Response {
		Response::builder()
			.status(StatusCode::UNAUTHORIZED)
			.header("Authorization", "Basic")
			.header("WWW-Authenticate", "Basic realm=\"stump\"")
			.body(Body::default())
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
	type Rejection = Response;

	async fn from_request_parts(
		parts: &mut Parts,
		_: &S,
	) -> Result<Self, Self::Rejection> {
		if parts.method == Method::OPTIONS {
			return Ok(Self);
		}

		let req_context = parts
			.extensions
			.get::<RequestContext>()
			.ok_or_else(|| APIError::Unauthorized.into_response())?;

		req_context
			.enforce_permissions(&[UserPermission::AccessBookClub])
			.map_err(|e| e.into_response())?;

		Ok(Self)
	}
}

// TODO(axum-upgrade): Test this refactor...
