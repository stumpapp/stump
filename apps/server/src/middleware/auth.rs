use axum::{
	body::Body,
	extract::{OriginalUri, Request, State},
	http::{header, StatusCode},
	middleware::Next,
	response::{IntoResponse, Redirect, Response},
	Extension, Json,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use chrono::Utc;
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
	config::{
		jwt::verify_user_jwt,
		session::{delete_cookie_header, SESSION_USER_KEY},
		state::AppState,
	},
	errors::{api_error_message, APIError, APIResult},
	routers::{enforce_max_sessions, relative_favicon_path},
	utils::{
		decode_base64_credentials, get_session_user, user_has_all_permissions,
		verify_password,
	},
};

use super::host::HostExtractor;

/// A struct to represent the authenticated user in the current request context. A user is
/// authenticated if they meet one of the following criteria:
/// - They have a valid session
/// - They have a valid bearer token (session may not exist)
/// - They have valid basic auth credentials (session is created after successful authentication)
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
	#[tracing::instrument(skip(self))]
	pub fn user_and_enforce_permissions(
		&self,
		permissions: &[UserPermission],
	) -> APIResult<User> {
		self.enforce_permissions(permissions)?;
		Ok(self.user().clone())
	}

	/// Enforce that the current user is the server owner, otherwise return an error
	#[tracing::instrument(skip(self))]
	pub fn enforce_server_owner(&self) -> APIResult<()> {
		let user = self.user();

		if user.is_server_owner {
			Ok(())
		} else {
			tracing::error!(
				username = &user.username,
				"User is not server owner, denying access"
			);
			Err(APIError::Forbidden(
				api_error_message::FORBIDDEN_ACTION.to_string(),
			))
		}
	}

	/// Get the current user and enforce that they are the server owner, otherwise return an error
	#[tracing::instrument(skip(self))]
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
	HostExtractor(host_details): HostExtractor,
	mut session: Session,
	mut req: Request,
	next: Next,
) -> Result<Response, impl IntoResponse> {
	let req_headers = req.headers().clone();
	let auth_header = req_headers
		.get(header::AUTHORIZATION)
		.and_then(|header| header.to_str().ok());

	let request_uri = req.extensions().get::<OriginalUri>().cloned().map_or_else(
		|| req.uri().path().to_owned(),
		|path| path.0.path().to_owned(),
	);

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
		}

		return Err(APIError::Unauthorized.into_response());
	};

	let user = match auth_header {
		_ if auth_header.starts_with("Bearer ") && auth_header.len() > 7 => {
			let token = auth_header[7..].to_owned();
			handle_bearer_auth(token, &ctx.db)
				.await
				.map_err(|e| e.into_response())?
		},
		_ if auth_header.starts_with("Basic ") && auth_header.len() > 6 && is_opds => {
			let encoded_credentials = auth_header[6..].to_owned();
			handle_basic_auth(encoded_credentials, &ctx.db, &mut session)
				.await
				.map_err(|e| e.into_response())?
		},
		_ => return Err(APIError::Unauthorized.into_response()),
	};

	req.extensions_mut().insert(RequestContext(user));

	Ok(next.run(req).await)
}

/// Middleware to check if a user has the required permissions to access a route. If the user does
/// not have the required permissions, the middleware will reject the request.
#[tracing::instrument(skip(req, next))]
pub async fn permission_middleware(
	State(permissions): State<Vec<UserPermission>>,
	Extension(ctx): Extension<RequestContext>,
	req: Request,
	next: Next,
) -> Result<Response, Response> {
	ctx.enforce_permissions(&permissions)
		.map_err(|e| e.into_response())?;

	Ok(next.run(req).await)
}

/// Middleware to check if a user is the server owner. If the user is not the server owner, the
/// middleware will reject the request.
#[tracing::instrument(skip(req, next))]
pub async fn server_owner_middleware(
	Extension(ctx): Extension<RequestContext>,
	req: Request,
	next: Next,
) -> Result<Response, Response> {
	ctx.enforce_server_owner().map_err(|e| e.into_response())?;
	Ok(next.run(req).await)
}

/// A function to handle bearer token authentication. This function will verify the token and
/// return the user if the token is valid.
#[tracing::instrument(skip_all)]
async fn handle_bearer_auth(token: String, client: &PrismaClient) -> APIResult<User> {
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

/// A function to handle basic authentication. This function will decode the credentials and
/// attempt to authenticate the user. If the user is authenticated, a session will be created
/// for the user.
///
/// Note: Basic authentication is only allowed for OPDS requests.
#[tracing::instrument(skip_all)]
async fn handle_basic_auth(
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
		.with(user::sessions::fetch(vec![session::expiry_time::gt(
			Utc::now().into(),
		)]))
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
			"Basic authentication successful. Creating session for user"
		);
		enforce_max_sessions(&user, client).await?;
		let user = User::from(user);
		session.insert(SESSION_USER_KEY, user.clone()).await?;
		return Ok(user);
	}

	Err(APIError::Unauthorized)
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
	use std::{str::FromStr, sync::Arc};

	use axum::{middleware, routing::get, Extension, Router};
	use axum_test::{TestServer, TestServerConfig};
	use header::{HeaderName, HeaderValue};
	use prisma_client_rust::MockStore;
	use stump_core::{config::StumpConfig, Ctx};
	use time::Duration;
	use tower_sessions::{cookie::SameSite, Expiry, MemoryStore, SessionManagerLayer};

	use crate::{
		config::jwt::{create_user_jwt, CreatedToken},
		http_server::StumpRequestInfo,
		utils::{hash_password, test_utils::create_prisma_user},
	};

	use super::*;

	#[test]
	fn test_request_context_user() {
		let user = User::default();
		let request_context = RequestContext(user.clone());
		assert!(user.is(request_context.user()));
	}

	#[test]
	fn test_request_context_id() {
		let user = User::default();
		let request_context = RequestContext(user.clone());
		assert_eq!(user.id, request_context.id());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_server_owner() {
		let user = User {
			is_server_owner: true,
			..Default::default()
		};
		let request_context = RequestContext(user.clone());
		assert!(request_context
			.enforce_permissions(&[UserPermission::AccessBookClub])
			.is_ok());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_permitted() {
		let user = User {
			permissions: vec![UserPermission::AccessBookClub],
			..Default::default()
		};
		let request_context = RequestContext(user.clone());
		assert!(request_context
			.enforce_permissions(&[UserPermission::AccessBookClub])
			.is_ok());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_denied() {
		let user = User::default();
		let request_context = RequestContext(user.clone());
		assert!(request_context
			.enforce_permissions(&[UserPermission::AccessBookClub])
			.is_err());
	}

	#[test]
	fn test_request_context_enforce_permissions_when_denied_partial() {
		let user = User {
			permissions: vec![UserPermission::AccessBookClub],
			..Default::default()
		};
		let request_context = RequestContext(user.clone());
		assert!(request_context
			.enforce_permissions(&[
				UserPermission::AccessBookClub,
				UserPermission::CreateLibrary
			])
			.is_err());
	}

	#[test]
	fn test_request_context_user_and_enforce_permissions_when_permitted() {
		let user = User {
			permissions: vec![UserPermission::AccessBookClub],
			..Default::default()
		};
		let request_context = RequestContext(user.clone());
		assert!(user.is(&request_context
			.user_and_enforce_permissions(&[UserPermission::AccessBookClub])
			.unwrap()));
	}

	#[test]
	fn test_request_context_user_and_enforce_permissions_when_denied() {
		let user = User::default();
		let request_context = RequestContext(user.clone());
		assert!(request_context
			.user_and_enforce_permissions(&[UserPermission::AccessBookClub])
			.is_err());
	}

	#[test]
	fn test_request_context_enforce_server_owner_when_server_owner() {
		let user = User {
			is_server_owner: true,
			..Default::default()
		};
		let request_context = RequestContext(user.clone());
		assert!(request_context.enforce_server_owner().is_ok());
	}

	#[test]
	fn test_request_context_enforce_server_owner_when_not_server_owner() {
		let user = User::default();
		let request_context = RequestContext(user.clone());
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

	fn setup_test_app() -> (Arc<PrismaClient>, MockStore, TestServer) {
		let (ctx, mock_store) = Ctx::mock();

		let client = ctx.db.clone();

		let session_layer = {
			// Note: we use the memory store because the session store (backed by prisma)
			// is just too complex to mock out for testing.
			let store = MemoryStore::default();
			SessionManagerLayer::new(store)
				.with_name("stump-test-session")
				.with_expiry(Expiry::OnInactivity(Duration::seconds(120)))
				.with_path("/".to_string())
				.with_same_site(SameSite::Lax)
				.with_secure(false)
		};
		let app_state = AppState::new(ctx);

		let router = Router::new()
			.route(
				"/test",
				get(|Extension(_): Extension<RequestContext>| async { "Hello, world!" }),
			)
			.route("/opds/v1.2", get(|| async { "Hello, OPDS v1.2!" }))
			.route("/opds/v2.0", get(|| async { "Hello, OPDS v2.0!" }))
			.layer(middleware::from_fn_with_state(
				app_state.clone(),
				auth_middleware,
			));
		let app = Router::new()
			.merge(router)
			.with_state(app_state)
			.layer(session_layer)
			.into_make_service_with_connect_info::<StumpRequestInfo>();

		let config = TestServerConfig::builder()
			.save_cookies()
			.http_transport()
			.build();

		let mut server = TestServer::new_with_config(app, config).unwrap();
		let (host_header, host_value) = host_header();
		server.add_header(host_header, host_value);

		(client, mock_store, server)
	}

	fn host_header() -> (HeaderName, HeaderValue) {
		(
			HeaderName::from_str("Host").expect("Failed to create header"),
			HeaderValue::from_str("localhost:10801").expect("Failed to create header"),
		)
	}

	#[tokio::test]
	async fn test_auth_middleware_with_valid_jwt() {
		let config = StumpConfig::debug();
		let user = User {
			id: "oromei-id".to_string(),
			username: "oromei".to_string(),
			..Default::default()
		};
		let CreatedToken { access_token, .. } =
			create_user_jwt("oromei-id", &config).expect("Failed to create JWT");

		let hashed_pass =
			hash_password("password", &config).expect("Failed to hash password");

		let (client, mock_store, server) = setup_test_app();

		mock_store
			.expect(
				client
					.user()
					.find_unique(user::id::equals("oromei-id".to_string()))
					.with(user::user_preferences::fetch())
					.with(user::age_restriction::fetch()),
				Some(create_prisma_user(&user, hashed_pass.clone())),
			)
			.await;

		let response = server
			.get("/test")
			.add_header(
				HeaderName::from_str("Authorization").expect("Failed to create header"),
				HeaderValue::from_str(&format!("Bearer {access_token}"))
					.expect("Failed to create header"),
			)
			.await;

		assert_eq!(response.status_code().as_u16(), 200);
	}

	#[tokio::test]
	async fn test_auth_middleware_with_invalid_jwt() {
		let (_, _, server) = setup_test_app();

		let response = server
			.get("/test")
			.add_header(
				HeaderName::from_str("Authorization").expect("Failed to create header"),
				HeaderValue::from_str("Bearer invalid-token")
					.expect("Failed to create header"),
			)
			.await;

		// No prisma queries are issued because the token is invalid

		assert_eq!(response.status_code().as_u16(), 401);
	}

	#[tokio::test]
	async fn test_auth_middleware_with_jwt_for_locked_user() {
		let config = StumpConfig::debug();
		let user = User {
			id: "oromei-id".to_string(),
			username: "oromei".to_string(),
			is_locked: true,
			..Default::default()
		};

		let CreatedToken { access_token, .. } =
			create_user_jwt("oromei-id", &config).expect("Failed to create JWT");

		let hashed_pass =
			hash_password("password", &config).expect("Failed to hash password");

		let (client, mock_store, server) = setup_test_app();

		mock_store
			.expect(
				client
					.user()
					.find_unique(user::id::equals("oromei-id".to_string()))
					.with(user::user_preferences::fetch())
					.with(user::age_restriction::fetch()),
				Some(create_prisma_user(&user, hashed_pass.clone())),
			)
			.await;

		let response = server
			.get("/test")
			.add_header(
				HeaderName::from_str("Authorization").expect("Failed to create header"),
				HeaderValue::from_str(&format!("Bearer {access_token}"))
					.expect("Failed to create header"),
			)
			.await;

		assert_eq!(response.status_code().as_u16(), 403);
	}

	#[tokio::test]
	async fn test_auth_middleware_with_valid_basic_auth_non_opds() {
		let config = StumpConfig::debug();
		let user = User {
			id: "oromei-id".to_string(),
			username: "oromei".to_string(),
			..Default::default()
		};

		let hashed_pass =
			hash_password("password", &config).expect("Failed to hash password");

		let (client, mock_store, server) = setup_test_app();

		mock_store
			.expect(
				client
					.user()
					.find_unique(user::username::equals("oromei".to_string()))
					.with(user::user_preferences::fetch())
					.with(user::age_restriction::fetch())
					.with(user::sessions::fetch(vec![session::expiry_time::gt(
						Utc::now().into(),
					)])),
				Some(create_prisma_user(&user, hashed_pass.clone())),
			)
			.await;

		let response = server
			.get("/test")
			.add_header(
				HeaderName::from_str("Authorization").expect("Failed to create header"),
				HeaderValue::from_str(&format!(
					"Basic {}",
					STANDARD.encode(format!("{}:{}", "oromei", "password"))
				))
				.expect("Failed to create header"),
			)
			.await;

		assert_eq!(response.status_code().as_u16(), 401);
	}

	// TODO: Figure out how to mock Utc::now() otherwise I cannot mock the query which
	// loads the session relation...
	// - https://github.com/mseravalli/chrono-timesource
	// - https://github.com/alexanderlinne/chronobreak

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
	// 					Utc::now().into(),
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
}
