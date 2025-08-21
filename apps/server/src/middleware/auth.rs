use std::collections::HashMap;

use axum::{
	body::Body,
	extract::{OriginalUri, Path, Request, State},
	http::{header, StatusCode},
	middleware::Next,
	response::{IntoResponse, Redirect, Response},
	Extension, Json,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use graphql::data::AuthContext;
use models::{
	entity::{
		api_key::{self, APIKeyWithUser},
		user::{self, AuthUser},
	},
	shared::{
		api_key::{APIKeyPermissions, API_KEY_PREFIX},
		enums::UserPermission,
	},
};
use prefixed_api_key::{PrefixedApiKey, PrefixedApiKeyController};
use reqwest::Method;
use sea_orm::{prelude::*, Condition, DatabaseConnection};
use serde::Deserialize;
use stump_core::opds::v2_0::{
	authentication::{
		OPDSAuthenticationDocumentBuilder, OPDSSupportedAuthFlow,
		OPDS_AUTHENTICATION_DOCUMENT_REL, OPDS_AUTHENTICATION_DOCUMENT_TYPE,
	},
	link::OPDSLink,
};
use tower_sessions::Session;

use crate::{
	config::{
		jwt::extract_user_from_jwt,
		session::{delete_cookie_header, SESSION_USER_KEY},
		state::AppState,
	},
	errors::{api_error_message, APIError, APIResult},
	routers::{enforce_max_sessions, relative_favicon_path},
	utils::{
		current_utc_time, decode_base64_credentials, fetch_session_user, verify_password,
	},
};

use super::host::HostExtractor;

pub const STUMP_SAVE_BASIC_SESSION_HEADER: &str = "X-Stump-Save-Session";

/// A middleware to authenticate a user by one of the three methods:
/// - Bearer token (JWT or API key)
/// - Session cookie
/// - Basic auth (only for OPDS v1.2 requests)
/// This middleware should be used broadly across the application, however in instances where
/// a router is scoped to an API key, the `api_key_middlware` should be used instead.
///
/// If the user is authenticated, the middleware will insert the user into the request
/// extensions.
///
/// Note: It is important that this middlware is placed _after_ any middleware/handlers which access the
/// request extensions, as the user is inserted into the request extensions dynamically here.
#[tracing::instrument(skip_all)]
pub async fn auth_middleware(
	State(ctx): State<AppState>,
	HostExtractor(host_details): HostExtractor,
	mut session: Session,
	mut req: Request,
	next: Next,
) -> Result<Response, impl IntoResponse> {
	let req_headers = req.headers().clone();
	let auth_header = req_headers
		.get(header::AUTHORIZATION)
		.and_then(|header| header.to_str().ok());
	let save_basic_session = req_headers
		.get(STUMP_SAVE_BASIC_SESSION_HEADER)
		.and_then(|header| header.to_str().ok())
		.is_none_or(|header| header == "true");

	let request_uri = req.extensions().get::<OriginalUri>().cloned().map_or_else(
		|| req.uri().path().to_owned(),
		|path| path.0.path().to_owned(),
	);

	let session_user = fetch_session_user(&session, ctx.conn.as_ref())
		.await
		.map_err(|e| {
			tracing::error!(error = ?e, "Failed to fetch user from session");
			APIError::Unauthorized.into_response()
		})?;

	if let Some(user) = session_user {
		req.extensions_mut().insert(AuthContext {
			user,
			api_key: None,
		});
		return Ok(next.run(req).await);
	}

	if cfg!(debug_assertions) {
		tracing::debug!(
			?auth_header,
			?save_basic_session,
			?request_uri,
			?req_headers,
			"No session in middleware, falling back to auth header"
		);
	}

	let is_opds = request_uri.starts_with("/opds");
	let is_swagger = request_uri.starts_with("/swagger-ui");

	let is_playground_request =
		request_uri.starts_with("/api/graphql") && *req.method() == Method::GET;
	let is_playground_allowed = ctx.config.enable_swagger || cfg!(debug_assertions);
	let is_playground = is_playground_request && is_playground_allowed;

	let Some(auth_header) = auth_header else {
		if is_opds {
			// If we are access the OPDS auth document, we allow it
			if request_uri.ends_with("/opds/v2.0/auth") {
				return Ok(next.run(req).await);
			}

			let opds_version = request_uri
				.split('/')
				.nth(2)
				.map_or("1.2".to_string(), |v| v.replace('v', ""));

			return Err(
				OPDSBasicAuth::new(opds_version, host_details.url()).into_response()
			);
		} else if is_swagger {
			// Sign in via React app and then redirect to server-side swagger-ui
			return Err(Redirect::to("/auth?redirect=%2Fswagger-ui/").into_response());
		} else if is_playground {
			// Sign in via React app and then redirect to server-side playground
			return Err(Redirect::to("/auth?redirect=%2Fapi%2Fgraphql").into_response());
		}

		return Err(APIError::Unauthorized.into_response());
	};

	let req_ctx = match auth_header {
		_ if auth_header.starts_with("Bearer ") && auth_header.len() > 7 => {
			let token = auth_header[7..].to_owned();
			handle_bearer_auth(token, ctx.conn.as_ref())
				.await
				.map_err(|e| e.into_response())?
		},
		_ if auth_header.starts_with("Basic ") && auth_header.len() > 6 && is_opds => {
			let encoded_credentials = auth_header[6..].to_owned();
			handle_basic_auth(
				encoded_credentials,
				ctx.conn.as_ref(),
				&mut session,
				save_basic_session,
			)
			.await
			.map_err(|e| e.into_response())?
		},
		_ => return Err(APIError::Unauthorized.into_response()),
	};

	req.extensions_mut().insert(req_ctx);

	Ok(next.run(req).await)
}

#[derive(Debug, Deserialize)]
pub struct APIKeyPath(HashMap<String, String>);

impl APIKeyPath {
	fn get_key(&self) -> Option<String> {
		self.0.get("api_key").cloned()
	}
}

/// A middleware to authenticate a user by an API key in a *very* specific way. This middleware
/// assumes that a fully qualified API key is provided in the path. This is used for two features today:
///
/// 1. An alternative for bearer token on the OPDS v1.2 API
/// 2. A way to authenticate users for the KoReader sync API
///
/// This isn't necessary for OPDS v2.0 as it has a more robust authentication mechanism. The koreader
/// frontend app will send an md5 hash of whatever password you provide. Stump does not use the same
/// hashing algorithm, therefore the default auth method would not work.
pub async fn api_key_middleware(
	State(ctx): State<AppState>,
	Path(params): Path<APIKeyPath>,
	mut req: Request,
	next: Next,
) -> Result<Response, impl IntoResponse> {
	let Some(api_key) = params.get_key() else {
		tracing::error!("No API key provided");
		return Err(APIError::Unauthorized.into_response());
	};

	let Ok(pak) = PrefixedApiKey::from_string(api_key.as_str()) else {
		tracing::error!("Failed to parse API key");
		return Err(APIError::Unauthorized.into_response());
	};

	let user = validate_api_key(pak, ctx.conn.as_ref())
		.await
		.map_err(|e| e.into_response())?;

	req.extensions_mut().insert(AuthContext {
		user,
		api_key: Some(api_key),
	});

	Ok(next.run(req).await)
}

/// Middleware to check if a user has the required permissions to access a route. If the user does
/// not have the required permissions, the middleware will reject the request.
#[tracing::instrument(skip(req, next))]
pub async fn permission_middleware(
	State(permissions): State<Vec<UserPermission>>,
	Extension(ctx): Extension<AuthContext>,
	req: Request,
	next: Next,
) -> Result<Response, Response> {
	ctx.enforce_permissions(&permissions).map_err(|e| {
		tracing::error!(error = ?e, "User does not have required permissions");
		APIError::forbidden_discreet().into_response()
	})?;

	Ok(next.run(req).await)
}

/// Middleware to check if a user is the server owner. If the user is not the server owner, the
/// middleware will reject the request.
#[tracing::instrument(skip(req, next))]
pub async fn server_owner_middleware(
	Extension(ctx): Extension<AuthContext>,
	req: Request,
	next: Next,
) -> Result<Response, Response> {
	ctx.enforce_server_owner().map_err(|e| {
		tracing::error!(error = ?e, "User is not the server owner");
		APIError::forbidden_discreet().into_response()
	})?;
	Ok(next.run(req).await)
}

pub async fn validate_api_key(
	pak: PrefixedApiKey,
	conn: &DatabaseConnection,
) -> APIResult<AuthUser> {
	let controller = PrefixedApiKeyController::configure()
		.prefix(API_KEY_PREFIX.to_owned())
		.seam_defaults()
		.finalize()?;

	let long_token_hash = controller.long_token_hashed(&pak);
	let validation_start = DateTimeWithTimeZone::from(current_utc_time());

	let APIKeyWithUser { api_key, user } = APIKeyWithUser::find()
		.filter(
			Condition::all()
				.add(
					api_key::Column::ShortToken
						.eq(pak.short_token().to_string())
						.and(api_key::Column::LongTokenHash.eq(long_token_hash)),
				)
				.add(
					Condition::any()
						.add(api_key::Column::ExpiresAt.gte(validation_start))
						.add(api_key::Column::ExpiresAt.is_null()),
				),
		)
		.into_model::<APIKeyWithUser>()
		.one(conn)
		.await?
		.ok_or(APIError::Unauthorized)?;

	let api_key_permissions = api_key.permissions.clone();

	// Note: we check as a precaution. If a user had the permission revoked, that logic should also
	// clean up keys.
	let can_use_key =
		user.is_server_owner || user.permissions.contains(&UserPermission::AccessAPIKeys);

	if !can_use_key || !controller.check_hash(&pak, &api_key.long_token_hash) {
		tracing::error!(?can_use_key, "API key validation failed!");
		// TODO(security): track?
		return Err(APIError::Unauthorized);
	}

	let update_result = api_key::Entity::update_many()
		.filter(api_key::Column::Id.eq(api_key.id))
		.col_expr(api_key::Column::LastUsedAt, Expr::value(validation_start))
		.exec(conn)
		.await;
	if let Err(e) = update_result {
		// IMO we shouldn't fail the request if we can't update the last used at field
		tracing::error!(error = ?e, "Failed to update API key");
	}

	let constructed_user = match api_key_permissions {
		APIKeyPermissions::Inherit(_) => AuthUser::from(user),
		// Note: we don't construct permission sets for inferred permissions. What you
		// give to your API key is what it gets.
		APIKeyPermissions::Custom(permissions) => AuthUser {
			permissions,
			..AuthUser::from(user)
		},
	};

	Ok(constructed_user)
}

/// A function to handle bearer token authentication. This function will verify the token and
/// return the user if the token is valid.
#[tracing::instrument(skip_all)]
async fn handle_bearer_auth(
	token: String,
	conn: &DatabaseConnection,
) -> APIResult<AuthContext> {
	match PrefixedApiKey::from_string(token.as_str()) {
		Ok(api_key) if api_key.prefix() == API_KEY_PREFIX => {
			return validate_api_key(api_key, conn)
				.await
				.map(|user| AuthContext {
					user,
					api_key: Some(token),
				});
		},
		_ => (),
	};

	let user_id = extract_user_from_jwt(&token)?;

	let fetched_user = user::LoginUser::find()
		.filter(user::Column::Id.eq(user_id.clone()))
		.into_model::<user::LoginUser>()
		.one(conn)
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

	Ok(AuthContext {
		user: AuthUser::from(user),
		api_key: None,
	})
}

/// A function to handle basic authentication. This function will decode the credentials and
/// attempt to authenticate the user. If the user is authenticated, a session will be created
/// for the user.
///
/// Note: Basic authentication is only allowed for OPDS requests.
#[tracing::instrument(skip_all)]
async fn handle_basic_auth(
	encoded_credentials: String,
	conn: &DatabaseConnection,
	session: &mut Session,
	save_session: bool,
) -> APIResult<AuthContext> {
	let decoded_bytes = STANDARD
		.decode(encoded_credentials.as_bytes())
		.map_err(|e| APIError::InternalServerError(e.to_string()))?;
	let decoded_credentials = decode_base64_credentials(decoded_bytes)?;

	let fetched_user = user::LoginUser::find()
		.filter(user::Column::Username.eq(decoded_credentials.username.clone()))
		.into_model::<user::LoginUser>()
		.one(conn)
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
	} else if !is_match {
		return Err(APIError::Unauthorized);
	}

	tracing::trace!(username = &user.username, "Basic authentication successful");

	if save_session {
		tracing::trace!("Saving session for user");
		enforce_max_sessions(&user, conn).await?;
		session
			.insert(SESSION_USER_KEY, AuthUser::from(user.clone()))
			.await?;
	}

	Ok(AuthContext {
		user: AuthUser::from(user.clone()),
		api_key: None,
	})
}

/// A struct used to hold the details required to generate an OPDS basic auth response
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
				.id(format!("{}/opds/v2.0/auth", self.service_url))
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
			let json_response = Json(document).into_response();
			let body = json_response.into_body();

			// We want to encourage the client to delete any existing session cookies when the current
			// is no longer valid
			let delete_cookie = delete_cookie_header();

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
				.header(delete_cookie.0, delete_cookie.1)
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
				.body(Body::default())
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
			.body(Body::default())
			.unwrap_or_else(|e| {
				tracing::error!(error = ?e, "Failed to build response");
				StatusCode::INTERNAL_SERVER_ERROR.into_response()
			})
	}
}

#[cfg(test)]
mod tests {

	use super::*;

	#[test]
	fn test_request_context_user() {
		let user = AuthUser::default();
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(user.is(&request_context.user()));
	}

	#[test]
	fn test_request_context_id() {
		let user = AuthUser::default();
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert_eq!(user.id, request_context.id());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_server_owner() {
		let user = AuthUser {
			is_server_owner: true,
			..Default::default()
		};
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(request_context
			.enforce_permissions(&[UserPermission::AccessBookClub])
			.is_ok());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_permitted() {
		let user = AuthUser {
			permissions: vec![UserPermission::AccessBookClub],
			..Default::default()
		};
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(request_context
			.enforce_permissions(&[UserPermission::AccessBookClub])
			.is_ok());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_denied() {
		let user = AuthUser::default();
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(request_context
			.enforce_permissions(&[UserPermission::AccessBookClub])
			.is_err());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_denied_partial() {
		let user = AuthUser {
			permissions: vec![UserPermission::AccessBookClub],
			..Default::default()
		};
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(request_context
			.enforce_permissions(&[
				UserPermission::AccessBookClub,
				UserPermission::CreateLibrary
			])
			.is_err());
	}

	#[test]
	fn test_request_context_user_and_enforce_permissions_when_permitted() {
		let user = AuthUser {
			permissions: vec![UserPermission::AccessBookClub],
			..Default::default()
		};
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(user.is(&request_context
			.user_and_enforce_permissions(&[UserPermission::AccessBookClub])
			.unwrap()));
	}

	#[test]
	fn test_request_context_user_and_enforce_permissions_when_denied() {
		let user = AuthUser::default();
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(request_context
			.user_and_enforce_permissions(&[UserPermission::AccessBookClub])
			.is_err());
	}

	#[test]
	fn test_request_context_enforce_server_owner_when_server_owner() {
		let user = AuthUser {
			is_server_owner: true,
			..Default::default()
		};
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(request_context.enforce_server_owner().is_ok());
	}

	#[test]
	fn test_request_context_enforce_server_owner_when_not_server_owner() {
		let user = AuthUser::default();
		let request_context = AuthContext {
			user: user.clone(),
			api_key: None,
		};
		assert!(request_context.enforce_server_owner().is_err());
	}

	#[test]
	fn test_basic_auth_into_response() {
		let response = BasicAuth.into_response();
		assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
		assert_eq!(response.headers().get("Authorization").unwrap(), "Basic");
		assert_eq!(
			response.headers().get("WWW-Authenticate").unwrap(),
			"Basic realm=\"stump\""
		);
	}

	#[test]
	fn test_opds_basic_auth_v1_2_into_response() {
		let response =
			OPDSBasicAuth::new("1.2".to_string(), "http://localhost".to_string())
				.into_response();
		assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
		assert_eq!(response.headers().get("Authorization").unwrap(), "Basic");
		assert_eq!(
			response.headers().get("WWW-Authenticate").unwrap(),
			"Basic realm=\"stump OPDS v1.2\""
		);
	}

	#[test]
	fn test_opds_basic_auth_v2_0_into_response() {
		let response =
			OPDSBasicAuth::new("2.0".to_string(), "http://localhost".to_string())
				.into_response();
		assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
		assert_eq!(response.headers().get("Authorization").unwrap(), "Basic");
		assert_eq!(
			response.headers().get("WWW-Authenticate").unwrap(),
			"Basic realm=\"stump OPDS v2.0\""
		);
		assert_eq!(
			response.headers().get("Link").unwrap(),
			"<http://localhost/opds/v2.0/auth>; rel=\"http://opds-spec.org/auth/document\"; type=\"application/opds-authentication+json\""
		);
	}

	// TODO(sea-orm): Fix tests

	// fn setup_test_app() -> (Arc<PrismaClient>, MockStore, TestServer) {
	// 	let (ctx, mock_store) = Ctx::mock();

	// 	let client = ctx.db.clone();

	// 	let session_layer = {
	// 		// Note: we use the memory store because the session store (backed by prisma)
	// 		// is just too complex to mock out for testing.
	// 		let store = MemoryStore::default();
	// 		SessionManagerLayer::new(store)
	// 			.with_name("stump-test-session")
	// 			.with_expiry(Expiry::OnInactivity(Duration::seconds(120)))
	// 			.with_path("/".to_string())
	// 			.with_same_site(SameSite::Lax)
	// 			.with_secure(false)
	// 	};
	// 	let app_state = AppState::new(ctx);

	// 	let router = Router::new()
	// 		.route(
	// 			"/test",
	// 			get(|Extension(_): Extension<AuthContext>| async { "Hello, world!" }),
	// 		)
	// 		.route("/opds/v1.2", get(|| async { "Hello, OPDS v1.2!" }))
	// 		.route("/opds/v2.0", get(|| async { "Hello, OPDS v2.0!" }))
	// 		.layer(middleware::from_fn_with_state(
	// 			app_state.clone(),
	// 			auth_middleware,
	// 		));
	// 	let app = Router::new()
	// 		.merge(router)
	// 		.with_state(app_state)
	// 		.layer(session_layer)
	// 		.into_make_service_with_connect_info::<StumpRequestInfo>();

	// 	let mut config = TestServerConfig::new();
	// 	config.save_cookies = true;
	// 	config.transport = Some(axum_test::Transport::HttpRandomPort);

	// 	let mut server = TestServer::new_with_config(app, config).unwrap();
	// 	let (host_header, host_value) = host_header();
	// 	server.add_header(host_header, host_value);

	// 	(client, mock_store, server)
	// }

	// fn host_header() -> (HeaderName, HeaderValue) {
	// 	(
	// 		HeaderName::from_str("Host").expect("Failed to create header"),
	// 		HeaderValue::from_str("localhost:10801").expect("Failed to create header"),
	// 	)
	// }

	// #[tokio::test]
	// async fn test_auth_middleware_with_valid_jwt() {
	// 	let config = StumpConfig::debug();
	// 	let user = AuthUser {
	// 		id: "oromei-id".to_string(),
	// 		username: "oromei".to_string(),
	// 		..Default::default()
	// 	};
	// 	let CreatedToken { access_token, .. } =
	// 		create_user_jwt("oromei-id", &config).expect("Failed to create JWT");

	// 	let hashed_pass =
	// 		hash_password("password", &config).expect("Failed to hash password");

	// 	let (client, mock_store, server) = setup_test_app();

	// 	mock_store
	// 		.expect(
	// 			client
	// 				.user()
	// 				.find_unique(user::id::equals("oromei-id".to_string()))
	// 				.with(user::user_preferences::fetch())
	// 				.with(user::age_restriction::fetch()),
	// 			Some(create_prisma_user(&user, hashed_pass.clone())),
	// 		)
	// 		.await;

	// 	let response = server
	// 		.get("/test")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str(&format!("Bearer {access_token}"))
	// 				.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	assert_eq!(response.status_code().as_u16(), 200);
	// }

	// #[tokio::test]
	// async fn test_auth_middleware_with_invalid_jwt() {
	// 	let (_, _, server) = setup_test_app();

	// 	let response = server
	// 		.get("/test")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str("Bearer invalid-token")
	// 				.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	// No prisma queries are issued because the token is invalid

	// 	assert_eq!(response.status_code().as_u16(), 401);
	// }

	// #[tokio::test]
	// async fn test_auth_middleware_with_jwt_for_locked_user() {
	// 	let config = StumpConfig::debug();
	// 	let user = User {
	// 		id: "oromei-id".to_string(),
	// 		username: "oromei".to_string(),
	// 		is_locked: true,
	// 		..Default::default()
	// 	};

	// 	let CreatedToken { access_token, .. } =
	// 		create_user_jwt("oromei-id", &config).expect("Failed to create JWT");

	// 	let hashed_pass =
	// 		hash_password("password", &config).expect("Failed to hash password");

	// 	let (client, mock_store, server) = setup_test_app();

	// 	mock_store
	// 		.expect(
	// 			client
	// 				.user()
	// 				.find_unique(user::id::equals("oromei-id".to_string()))
	// 				.with(user::user_preferences::fetch())
	// 				.with(user::age_restriction::fetch()),
	// 			Some(create_prisma_user(&user, hashed_pass.clone())),
	// 		)
	// 		.await;

	// 	let response = server
	// 		.get("/test")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str(&format!("Bearer {access_token}"))
	// 				.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	assert_eq!(response.status_code().as_u16(), 403);
	// }

	// #[tokio::test]
	// async fn test_auth_middleware_with_valid_basic_auth_non_opds() {
	// 	let config = StumpConfig::debug();
	// 	let user = User {
	// 		id: "oromei-id".to_string(),
	// 		username: "oromei".to_string(),
	// 		..Default::default()
	// 	};

	// 	let hashed_pass =
	// 		hash_password("password", &config).expect("Failed to hash password");

	// 	let (client, mock_store, server) = setup_test_app();

	// 	mock_store
	// 		.expect(
	// 			client
	// 				.user()
	// 				.find_unique(user::username::equals("oromei".to_string()))
	// 				.with(user::user_preferences::fetch())
	// 				.with(user::age_restriction::fetch())
	// 				.with(user::sessions::fetch(vec![session::expiry_time::gt(
	// 					current_utc_time().into(),
	// 				)])),
	// 			Some(create_prisma_user(&user, hashed_pass.clone())),
	// 		)
	// 		.await;

	// 	let response = server
	// 		.get("/test")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str(&format!(
	// 				"Basic {}",
	// 				STANDARD.encode(format!("{}:{}", "oromei", "password"))
	// 			))
	// 			.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	assert_eq!(response.status_code().as_u16(), 401);
	// }

	// #[tokio::test]
	// async fn test_auth_middleware_with_valid_basic_auth_opds_v1_2() {
	// 	let config = StumpConfig::debug();
	// 	let user = User {
	// 		id: "oromei-id".to_string(),
	// 		username: "oromei".to_string(),
	// 		..Default::default()
	// 	};

	// 	let hashed_pass =
	// 		hash_password("password", &config).expect("Failed to hash password");

	// 	let (client, mock_store, server) = setup_test_app();

	// 	mock_store
	// 		.expect(
	// 			client
	// 				.user()
	// 				.find_unique(user::username::equals("oromei".to_string()))
	// 				.with(user::user_preferences::fetch())
	// 				.with(user::age_restriction::fetch())
	// 				.with(user::sessions::fetch(vec![session::expiry_time::gt(
	// 					current_utc_time().into(),
	// 				)])),
	// 			Some(create_prisma_user(&user, hashed_pass.clone())),
	// 		)
	// 		.await;

	// 	let response = server
	// 		.get("/opds/v1.2")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str(&format!(
	// 				"Basic {}",
	// 				base64::engine::general_purpose::STANDARD
	// 					.encode(format!("{}:{}", "oromei", "password"))
	// 			))
	// 			.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	assert_eq!(response.status_code().as_u16(), 200);
	// }

	// fn create_key() -> (PrefixedApiKey, String, APIKey) {
	// 	let (pak, hash) =
	// 		APIKey::create_prefixed_key().expect("Failed to create API key");
	// 	let api_key_raw = pak.to_string();

	// 	let api_key = APIKey {
	// 		name: "Test API Key".to_string(),
	// 		long_token_hash: hash,
	// 		user_id: "oromei-id".to_string(),
	// 		permissions: APIKeyPermissions::inherit(),
	// 		..Default::default()
	// 	};

	// 	(pak, api_key_raw, api_key)
	// }

	// fn key_data(key: &APIKey, for_user: &User) -> api_key::Data {
	// 	api_key::Data {
	// 		id: key.id,
	// 		name: key.name.clone(),
	// 		short_token: String::default(),
	// 		long_token_hash: key.long_token_hash.clone(),
	// 		user_id: key.user_id.clone(),
	// 		user: Some(Box::new(create_prisma_user(for_user, String::default()))),
	// 		permissions: serde_json::to_vec(&key.permissions)
	// 			.expect("Failed to serialize"),
	// 		expires_at: key.expires_at,
	// 		created_at: key.created_at,
	// 		last_used_at: key.last_used_at,
	// 	}
	// }

	// #[tokio::test(start_paused = true)]
	// async fn test_auth_middleware_with_valid_api_key() {
	// 	let user = User {
	// 		id: "oromei-id".to_string(),
	// 		username: "oromei".to_string(),
	// 		is_server_owner: true,
	// 		..Default::default()
	// 	};

	// 	let (client, mock_store, server) = setup_test_app();

	// 	let (pak, api_key_raw, api_key) = create_key();

	// 	mock_store
	// 		.expect(
	// 			client
	// 				.api_key()
	// 				.find_first(vec![
	// 					api_key::short_token::equals(pak.short_token().to_string()),
	// 					api_key::long_token_hash::equals(api_key.long_token_hash.clone()),
	// 					api_key::user::is(vec![
	// 						user::deleted_at::equals(None),
	// 						user::is_locked::equals(false),
	// 					]),
	// 					or![
	// 						api_key::expires_at::gte(current_utc_time().into()),
	// 						api_key::expires_at::equals(None),
	// 					],
	// 				])
	// 				.with(api_key::user::fetch()),
	// 			Some(key_data(&api_key, &user)),
	// 		)
	// 		.await;

	// 	// It is a valid key, so we will update the last used at field
	// 	mock_store
	// 		.expect(
	// 			client.api_key().update(
	// 				api_key::id::equals(api_key.id),
	// 				vec![api_key::last_used_at::set(Some(current_utc_time().into()))],
	// 			),
	// 			key_data(&api_key, &user),
	// 		)
	// 		.await;

	// 	let response = server
	// 		.get("/test")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str(&format!("Bearer {api_key_raw}"))
	// 				.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	assert_eq!(response.status_code().as_u16(), 200);
	// }

	// #[tokio::test]
	// async fn test_auth_middleware_with_non_existent_api_key() {
	// 	let (client, mock_store, server) = setup_test_app();

	// 	let (pak, api_key_raw, api_key) = create_key();

	// 	mock_store
	// 		.expect(
	// 			client
	// 				.api_key()
	// 				.find_first(vec![
	// 					api_key::short_token::equals(pak.short_token().to_string()),
	// 					api_key::long_token_hash::equals(api_key.long_token_hash.clone()),
	// 					api_key::user::is(vec![
	// 						user::deleted_at::equals(None),
	// 						user::is_locked::equals(false),
	// 					]),
	// 					or![
	// 						api_key::expires_at::gte(current_utc_time().into()),
	// 						api_key::expires_at::equals(None),
	// 					],
	// 				])
	// 				.with(api_key::user::fetch()),
	// 			None,
	// 		)
	// 		.await;

	// 	let response = server
	// 		.get("/test")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str(&format!("Bearer {api_key_raw}"))
	// 				.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	assert_eq!(response.status_code().as_u16(), 401);
	// }

	// #[tokio::test]
	// async fn test_auth_middleware_with_revoked_api_key() {
	// 	let user = User {
	// 		id: "oromei-id".to_string(),
	// 		username: "oromei".to_string(),
	// 		// No access_api_keys permission
	// 		..Default::default()
	// 	};

	// 	let (client, mock_store, server) = setup_test_app();

	// 	let (pak, api_key_raw, api_key) = create_key();

	// 	mock_store
	// 		.expect(
	// 			client
	// 				.api_key()
	// 				.find_first(vec![
	// 					api_key::short_token::equals(pak.short_token().to_string()),
	// 					api_key::long_token_hash::equals(api_key.long_token_hash.clone()),
	// 					api_key::user::is(vec![
	// 						user::deleted_at::equals(None),
	// 						user::is_locked::equals(false),
	// 					]),
	// 					or![
	// 						api_key::expires_at::gte(current_utc_time().into()),
	// 						api_key::expires_at::equals(None),
	// 					],
	// 				])
	// 				.with(api_key::user::fetch()),
	// 			Some(key_data(&api_key, &user)),
	// 		)
	// 		.await;

	// 	// It is a valid key, but the user doesn't have permission to use it. So we will
	// 	// not update the last used at field

	// 	let response = server
	// 		.get("/test")
	// 		.add_header(
	// 			HeaderName::from_str("Authorization").expect("Failed to create header"),
	// 			HeaderValue::from_str(&format!("Bearer {api_key_raw}"))
	// 				.expect("Failed to create header"),
	// 		)
	// 		.await;

	// 	assert_eq!(response.status_code().as_u16(), 401);
	// }
}
