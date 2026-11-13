use std::sync::Arc;

use axum::{
	Extension, Json, Router,
	extract::{Query, State},
	http::{
		HeaderMap, HeaderValue,
		header::{CACHE_CONTROL, COOKIE, SET_COOKIE},
	},
	response::{IntoResponse, Redirect, Response},
	routing::get,
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::Utc;
use models::entity::{server_config, user};
use models::services::user::create_user_with_preferences;
use sea_orm::{
	ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, Set,
	entity::prelude::DateTimeWithTimeZone,
};
use serde::{Deserialize, Serialize};
use stump_core::image::thumbnail::generate_image_metadata_from_bytes;
use tower_sessions::Session;

use openidconnect::{Nonce, PkceCodeChallenge, PkceCodeVerifier};
use uuid::Uuid;

use crate::{
	config::{
		jwt::create_jwt_auth,
		oidc::{OidcProvider, exchange_code_for_claims, get_oidc_authorize_url},
		session::SESSION_USER_KEY,
		state::AppState,
	},
	errors::{APIError, APIResult},
	middleware::host::{HostDetails, HostExtractor},
	routers::enforce_max_sessions,
	utils::http::download_image,
};

const OIDC_STATE_COOKIE_NAME: &str = "stump_oidc_transaction";
const OIDC_STATE_COOKIE_SECURE_NAME: &str = "__Host-stump_oidc_transaction";
// ^ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#cookie_prefixes
const OIDC_STATE_COOKIE_PATH: &str = "/api/v2/auth/oidc";
const OIDC_STATE_TTL_SECONDS: u32 = 300;

pub(crate) fn mount() -> Router<AppState> {
	Router::new().nest(
		"/auth/oidc",
		Router::new()
			.route("/config", get(get_oidc_config))
			.route("/authorize", get(authorize))
			.route("/callback", get(callback)),
	)
}

fn cookie_name(secure: bool) -> &'static str {
	if secure {
		OIDC_STATE_COOKIE_SECURE_NAME
	} else {
		OIDC_STATE_COOKIE_NAME
	}
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OidcConfigResponse {
	pub enabled: bool,
	pub allow_registration: bool,
	pub disable_local_auth: bool,
}

/// Get a slice of the OIDC configuration
async fn get_oidc_config(
	State(ctx): State<AppState>,
) -> APIResult<Json<OidcConfigResponse>> {
	let config = &*ctx.config;

	let (enabled, allow_registration, disable_local_auth) =
		if let Some(oidc) = &config.oidc {
			(
				oidc.is_valid(),
				oidc.allow_registration,
				oidc.disable_local_auth,
			)
		} else {
			(false, false, false)
		};

	Ok(Json(OidcConfigResponse {
		enabled,
		allow_registration,
		disable_local_auth,
	}))
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AuthorizeQuery {
	/// If true, the callback will return JWT tokens instead of creating a session
	#[serde(default)]
	pub generate_token: bool,
	/// Optional redirect URL for the mobile app (e.g., "stump://auth/callback")
	/// If provided with generate_token=true, redirects to this URL with tokens as query params
	pub redirect_uri: Option<String>,
}

/// The OIDC state parameter passed through the authorization flow.
/// Contains both the original query params and the PKCE code verifier.
#[derive(Debug, Serialize, Deserialize)]
struct OidcState {
	state: String,
	query: AuthorizeQuery,
	pkce_verifier: String,
	nonce: String,
}

/// Initiate OIDC authorization
/// The frontend(s) redirects to this endpoint so the backend can generate the auth URL
/// and then redirect the user again to the provider
async fn authorize(
	State(ctx): State<AppState>,
	Extension(oidc_provider): Extension<Option<Arc<OidcProvider>>>,
	HostExtractor(service): HostExtractor,
	Query(query): Query<AuthorizeQuery>,
) -> Result<Response, APIError> {
	let secure_cookie = service.scheme.eq_ignore_ascii_case("https");
	validate_redirect_target(&query)?;

	let config = &*ctx.config;

	let oidc_config = config
		.oidc
		.as_ref()
		.filter(|c| c.is_valid())
		.ok_or_else(|| APIError::BadRequest("OIDC is not configured".to_string()))?;

	if !oidc_config.enabled {
		return Err(APIError::OIDCNotEnabled);
	}

	let oidc_provider = oidc_provider.ok_or(APIError::OIDCNotInitialized)?;

	let frontend_url = get_frontend_url(&ctx.conn, service).await?;

	let client = oidc_provider.create_client(&frontend_url)?;

	let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
	let state_value = Uuid::new_v4().to_string();
	let (redirect_to, nonce) = get_oidc_authorize_url(
		&client,
		&oidc_config.scopes,
		&state_value,
		Some(pkce_challenge),
	);
	let state = OidcState {
		state: state_value,
		query,
		pkce_verifier: pkce_verifier.secret().to_string(),
		nonce: nonce.secret().to_string(),
	};
	let state_cookie = encode_state_cookie(&state)?;

	tracing::debug!(?redirect_to, "Redirecting to OIDC provider");

	let mut response = Redirect::temporary(&redirect_to).into_response();
	let cookie = oidc_state_cookie(
		&state_cookie,
		secure_cookie,
		OIDC_STATE_TTL_SECONDS,
		&config.base_path,
	)?;
	response.headers_mut().insert(SET_COOKIE, cookie);
	response
		.headers_mut()
		.insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
	Ok(response)
}

#[derive(Debug, Deserialize)]
pub struct CallbackQuery {
	pub code: String,
	pub state: Option<String>,
}

fn oidc_state_cookie(
	value: &str,
	secure: bool,
	max_age: u32,
	base_path: &str,
) -> Result<HeaderValue, APIError> {
	let name = cookie_name(secure);
	let (path, secure_attribute) = if secure {
		("/".to_string(), "; Secure")
	} else {
		(format!("{base_path}{OIDC_STATE_COOKIE_PATH}"), "")
	};
	let cookie = format!(
		"{}={}; Path={}; Max-Age={}; HttpOnly; SameSite=Lax{}",
		name, value, path, max_age, secure_attribute
	);
	HeaderValue::from_bytes(cookie.as_bytes()).map_err(|error| {
		tracing::error!(?error, "Failed to build OIDC state cookie");
		APIError::InternalServerError("Failed to build OIDC state cookie".to_string())
	})
}

fn with_oidc_callback_headers(
	response: impl IntoResponse,
	secure_cookie: bool,
	base_path: &str,
) -> Result<Response, APIError> {
	let mut response = response.into_response();
	response.headers_mut().insert(
		SET_COOKIE,
		// clears the cookie
		oidc_state_cookie("", secure_cookie, 0, base_path)?,
	);
	response
		.headers_mut()
		.insert(CACHE_CONTROL, HeaderValue::from_static("no-store"));
	Ok(response)
}

fn encode_state_cookie(state: &OidcState) -> Result<String, APIError> {
	let bytes = serde_json::to_vec(state).map_err(|error| {
		tracing::error!(?error, "Failed to encode OIDC state cookie");
		APIError::InternalServerError("Failed to encode OIDC state".to_string())
	})?;
	Ok(URL_SAFE_NO_PAD.encode(bytes))
}

fn parse_state(
	state: Option<&str>,
	headers: &HeaderMap,
	secure: bool,
) -> Result<OidcState, APIError> {
	let state = state.ok_or(APIError::Unauthorized)?;
	let cookie_header = headers
		.get(COOKIE)
		.and_then(|value| value.to_str().ok())
		.ok_or(APIError::Unauthorized)?;
	let cookie_name = cookie_name(secure);
	let cookie_value = cookie_header
		.split(';')
		.filter_map(|cookie| cookie.trim().split_once('='))
		.find_map(|(name, value)| (name == cookie_name).then_some(value))
		.ok_or(APIError::Unauthorized)?;
	let bytes = URL_SAFE_NO_PAD
		.decode(cookie_value)
		.map_err(|_| APIError::Unauthorized)?;
	let oidc_state: OidcState =
		serde_json::from_slice(&bytes).map_err(|_| APIError::Unauthorized)?;

	if oidc_state.state != state {
		return Err(APIError::Unauthorized);
	}

	Ok(oidc_state)
}

fn validate_redirect_target(query: &AuthorizeQuery) -> Result<(), APIError> {
	if let Some(redirect_uri) = query.redirect_uri.as_deref() {
		if !query.generate_token || !is_allowed_mobile_redirect(redirect_uri) {
			return Err(APIError::BadRequest(
				"Unsupported OIDC mobile redirect URI".to_string(),
			));
		}
	}

	Ok(())
}

fn is_allowed_mobile_redirect(uri: &str) -> bool {
	uri == "stump://"
}

/// The handler for the OIDC callback (code exchange + user creation/login)
/// Provider redirects here with code, we exchange for tokens and create session or return JWT
async fn callback(
	State(ctx): State<AppState>,
	Extension(oidc_provider): Extension<Option<Arc<OidcProvider>>>,
	HostExtractor(service): HostExtractor,
	session: Session,
	headers: HeaderMap,
	Query(query): Query<CallbackQuery>,
) -> Result<Response, APIError> {
	let secure_cookie = service.scheme.eq_ignore_ascii_case("https");
	let config = &*ctx.config;

	let oidc_state = parse_state(query.state.as_deref(), &headers, secure_cookie)?;
	let generate_token = oidc_state.query.generate_token;
	validate_redirect_target(&oidc_state.query).map_err(|_| APIError::Unauthorized)?;

	let oidc_config = config
		.oidc
		.as_ref()
		.filter(|c| c.is_valid())
		.ok_or_else(|| APIError::BadRequest("OIDC is not configured".to_string()))?;

	if !oidc_config.enabled {
		return Err(APIError::OIDCNotEnabled);
	}

	let oidc_provider = oidc_provider.ok_or(APIError::OIDCNotInitialized)?;

	let base_url = get_frontend_url(&ctx.conn, service).await?;

	let (http_client, client) = (
		oidc_provider.http_client.clone(),
		oidc_provider.create_client(&base_url)?,
	);

	let extra_audiences = oidc_config.extra_audiences.clone();
	let pkce_verifier = PkceCodeVerifier::new(oidc_state.pkce_verifier);
	let expected_nonce = Nonce::new(oidc_state.nonce);

	let claims = exchange_code_for_claims(
		&http_client,
		&client,
		query.code,
		extra_audiences,
		Some(pkce_verifier),
		expected_nonce,
	)
	.await
	.map_err(|e| {
		tracing::error!("Failed to exchange code for claims: {:?}", e);
		APIError::Unauthorized
	})?;

	tracing::debug!(subject = %claims.subject, email = ?claims.email, "OIDC claims received");

	let existing_user = user::Entity::find()
		.filter(user::Column::OidcIssuerId.eq(&claims.subject))
		.one(ctx.conn.as_ref())
		.await
		.map_err(|e| {
			tracing::error!("Database error finding user: {:?}", e);
			APIError::InternalServerError("Database error".to_string())
		})?;

	let (user_model, is_new_user) = if let Some(user) = existing_user {
		tracing::debug!(user_id = %user.id, "Existing OIDC user logging in");
		// TODO(oidc): Re-download avatar from provider if the picture URL has changed?
		// Currently the avatar is only fetched once at registration
		(user, false)
	} else {
		let allow_registration = config
			.oidc
			.as_ref()
			.map(|c| c.allow_registration)
			.unwrap_or(false);

		if !allow_registration {
			tracing::warn!("OIDC registration attempt blocked");
			return Err(APIError::Forbidden(
				"OIDC registration is disabled".to_string(),
			));
		}

		// Determine if this is the first user (should be server owner)
		let user_count = user::Entity::find()
			.count(ctx.conn.as_ref())
			.await
			.map_err(|e| {
				tracing::error!(?e, "Failed to count users for OIDC registration");
				APIError::InternalServerError("Database error".to_string())
			})?;
		let is_server_owner = user_count == 0;

		let username = ensure_unique_username(ctx.conn.as_ref(), &claims.email).await?;

		let active_model = user::ActiveModel {
			username: Set(username),
			hashed_password: Set(String::new()), // OIDC users don't have a password
			oidc_issuer_id: Set(Some(claims.subject.clone())),
			oidc_email: Set(Some(claims.email.clone())),
			is_server_owner: Set(is_server_owner),
			..Default::default()
		};
		let user =
			create_user_with_preferences(ctx.conn.as_ref(), active_model, None).await?;

		if let Some(picture_url) = &claims.picture {
			match download_image(picture_url).await {
				Ok((bytes, ext)) => {
					let dest_path = ctx
						.config
						.avatars_directory()
						.join(format!("{}.{}", user.id, ext));

					let avatar_meta =
						match generate_image_metadata_from_bytes(bytes.clone()).await {
							Ok(meta) => Some(meta),
							Err(e) => {
								tracing::error!(error = ?e, "Failed to generate image metadata");
								None
							},
						};

					match tokio::fs::write(&dest_path, &bytes).await {
						Ok(_) => {
							let avatar_path_str = dest_path.to_string_lossy().to_string();
							if let Err(e) = user::Entity::update_many()
								.col_expr(
									user::Column::AvatarPath,
									sea_orm::sea_query::Expr::value(Some(
										avatar_path_str,
									)),
								)
								.col_expr(
									user::Column::AvatarMeta,
									sea_orm::sea_query::Expr::value(avatar_meta),
								)
								.col_expr(
									user::Column::AvatarUpdatedAt,
									sea_orm::sea_query::Expr::value::<
										Option<DateTimeWithTimeZone>,
									>(Some(Utc::now().into())),
								)
								.filter(user::Column::Id.eq(user.id.clone()))
								.exec(ctx.conn.as_ref())
								.await
							{
								tracing::warn!(?e, "Failed to persist OIDC avatar path");
							}
						},
						Err(e) => {
							tracing::warn!(?e, "Failed to write OIDC avatar to disk")
						},
					}
				},
				Err(e) => {
					tracing::warn!(?e, "Failed to download OIDC avatar — continuing")
				},
			}
		}

		tracing::info!(user_id = %user.id, is_server_owner = %is_server_owner, "Created new OIDC user");

		(user, true)
	};

	if user_model.is_locked {
		tracing::warn!(user_id = %user_model.id, "Locked user attempted login via OIDC");
		return Err(APIError::Forbidden("Account is locked".to_string()));
	};

	let auth_user = user::LoginUser::find()
		.filter(user::Column::Id.eq(user_model.id.clone()))
		.into_model::<user::LoginUser>()
		.one(ctx.conn.as_ref())
		.await?
		.ok_or(APIError::InternalServerError(
			"Failed to fetch user after registration.".to_string(),
		))?;

	enforce_max_sessions(&auth_user, ctx.conn.as_ref()).await?;

	tracing::info!(
		user_id = %user_model.id,
		is_new_user = %is_new_user,
		generate_token = %generate_token,
		"OIDC login successful"
	);

	if generate_token {
		let token = create_jwt_auth(&user_model.id, &ctx.conn, &ctx.config).await?;
		tracing::debug!(user_id = %user_model.id, "Generated JWT tokens for OIDC user");

		if let Some(redirect_uri) = oidc_state.query.redirect_uri {
			let redirect_url = format!(
				"{}?access_token={}&refresh_token={}&expires_at={}",
				redirect_uri,
				urlencoding::encode(&token.access_token),
				urlencoding::encode(&token.refresh_token.unwrap_or_default()),
				token.expires_at
			);
			tracing::debug!(user_id = %user_model.id, "Redirecting mobile app with tokens");
			with_oidc_callback_headers(
				Redirect::temporary(&redirect_url),
				secure_cookie,
				&config.base_path,
			)
		} else {
			with_oidc_callback_headers(Json(token), secure_cookie, &config.base_path)
		}
	} else {
		session
			.insert(SESSION_USER_KEY, user_model.id.clone())
			.await
			.map_err(|e| {
				tracing::error!("Failed to create session: {:?}", e);
				APIError::InternalServerError("Session error".to_string())
			})?;
		tracing::debug!(user_id = %user_model.id, "Created session for OIDC user");
		with_oidc_callback_headers(
			Redirect::temporary(&format!("{}/", config.base_path)),
			secure_cookie,
			&config.base_path,
		)
	}
}

/// Ensure username is unique by adding a suffix as needed
async fn ensure_unique_username(
	db: &sea_orm::DatabaseConnection,
	base_username: &str,
) -> APIResult<String> {
	let mut username = base_username.to_string();
	let mut suffix = 1;

	loop {
		let exists = user::Entity::find()
			.filter(user::Column::Username.eq(&username))
			.one(db)
			.await
			.map_err(|e| {
				tracing::error!("Failed to check username uniqueness: {:?}", e);
				APIError::InternalServerError("Database error".to_string())
			})?;

		if exists.is_none() {
			return Ok(username);
		}

		username = format!("{}_{}", base_username, suffix);
		suffix += 1;

		// lol
		if suffix > 100 {
			return Err(APIError::InternalServerError(
				"Failed to generate unique username".to_string(),
			));
		}
	}
}

/// Resolve the frontend base URL used for OIDC redirects. Stump will
/// take a configured `public_url` first and fallback onto the request host
/// if unavailable
async fn get_frontend_url(
	conn: &sea_orm::DatabaseConnection,
	service: HostDetails,
) -> APIResult<String> {
	let config = server_config::Entity::find().one(conn).await?.ok_or(
		APIError::InternalServerError("Missing server config".to_string()),
	)?;

	let public_url = config
		.public_url
		.map(|url| url.trim().trim_end_matches('/').to_string())
		.filter(|url| !url.is_empty());

	Ok(match public_url {
		Some(url) => append_base_path(&url, &service.base_path),
		None => service.url(),
	})
}

/// Appends a `base_path` to the path component of a given URL.
///
/// This function parses the path segment of the URL and handles the following cases:
/// - Returns the original URL unchanged if `base_path` is empty.
/// - Prevents duplicate appending if the URL path already equals `base_path` or starts with `base_path/`.
/// - Trims trailing slashes at the join point to avoid double slashes (`//`), while preserving query parameters (`?`) and fragments (`#`).
///
/// # Arguments
///
/// * `url` - The original full URL string (e.g., `"https://example.com"`).
/// * `base_path` - The base path to append, expected to start with `/` (e.g., `"/api"`).
///
/// # Returns
///
/// A new `String` containing the URL with `base_path` appended.
///
/// # Examples
///
/// ```ignore
/// // 1. Appends path while preserving query parameters and fragments
/// assert_eq!(
///     append_base_path("https://example.com", "/api"),
///     "https://example.com"
/// );
///
/// // 2. Handles trailing slashes cleanly without creating double slashes
/// assert_eq!(
///     append_base_path("https://example.com", "/api"),
///     "https://example.comapi"
/// );
///
/// // 3. Idempotency: avoids duplicating base_path if already present
/// assert_eq!(
///     append_base_path("https://example.comapi/users", "/api"),
///     "https://example.comapi/users"
/// );
/// ```
fn append_base_path(url: &str, base_path: &str) -> String {
	if base_path.is_empty() {
		return url.to_string();
	}

	let authority_end = url.find("://").and_then(|scheme_end| {
		url[scheme_end + 3..].find('/').map(|i| scheme_end + 3 + i)
	});
	let path_start = authority_end.unwrap_or(url.len());
	let path_end = url[path_start..]
		.find(['?', '#'])
		.map(|i| path_start + i)
		.unwrap_or(url.len());
	let path = &url[path_start..path_end];

	if path == base_path
		|| path.starts_with(&format!("{}/", base_path.trim_end_matches('/')))
	{
		url.to_string()
	} else {
		format!(
			"{}{}{}",
			url[..path_end].trim_end_matches('/'),
			base_path,
			&url[path_end..]
		)
	}
}
// ^ the url resolution is opposite to what i do elsewhere, e.g. for epub resource
// fetching. i _think_ this is correct here tho since the redirects is handled
// in the ident provider and would have to match

#[cfg(test)]
mod tests {
	use ::tests::db::test_database;
	use sea_orm::ActiveModelTrait;

	use super::*;

	#[test]
	fn test_mobile_redirect_only_accepts_app_callback_uri() {
		assert!(is_allowed_mobile_redirect("stump://"));
		assert!(
			validate_redirect_target(&AuthorizeQuery {
				generate_token: true,
				redirect_uri: Some("stump://".to_string()),
			})
			.is_ok()
		);

		for uri in [
			"https://biz.example/foo",
			"http://127.0.0.1:9000/foo",
			"stump://biz.example/foo",
			"stump:///foo",
			"//biz.example/foo",
		] {
			assert!(
				!is_allowed_mobile_redirect(uri),
				"should not have accepted: {uri}"
			);
			assert!(
				validate_redirect_target(&AuthorizeQuery {
					generate_token: true,
					redirect_uri: Some(uri.to_string()),
				})
				.is_err()
			);
		}
	}

	#[test]
	fn test_callback_state_requires_matching_state_cookie() {
		let state = OidcState {
			state: "state-id".to_string(),
			query: AuthorizeQuery {
				generate_token: true,
				redirect_uri: Some("stump://".to_string()),
			},
			pkce_verifier: "pkce-verifier".to_string(),
			nonce: "expected-nonce".to_string(),
		};
		let cookie_value = encode_state_cookie(&state).unwrap();
		let mut headers = HeaderMap::new();
		headers.insert(
			COOKIE,
			HeaderValue::from_bytes(
				format!("{OIDC_STATE_COOKIE_NAME}={cookie_value}").as_bytes(),
			)
			.unwrap(),
		);

		let parsed = parse_state(Some("state-id"), &headers, false).unwrap();
		assert_eq!(parsed.state, "state-id");
		assert_eq!(parsed.pkce_verifier, "pkce-verifier");
		assert_eq!(parsed.nonce, "expected-nonce");
		assert!(parse_state(Some("another-state"), &headers, false).is_err());
		assert!(parse_state(None, &headers, false).is_err());
	}

	#[test]
	fn test_callback_state_rejects_missing_or_malformed_cookie() {
		let headers = HeaderMap::new();
		assert!(parse_state(Some("state-id"), &headers, false).is_err());

		let mut headers = HeaderMap::new();
		headers.insert(
			COOKIE,
			HeaderValue::from_static("stump_oidc_transaction=not-valid-base64!"),
		);
		assert!(parse_state(Some("state-id"), &headers, false).is_err());
	}

	#[test]
	fn test_https_state_cookie_uses_host_prefix_and_secure_attributes() {
		let cookie =
			oidc_state_cookie("payload", true, OIDC_STATE_TTL_SECONDS, "/stump").unwrap();
		let cookie = cookie.to_str().unwrap();
		assert!(cookie.starts_with("__Host-stump_oidc_transaction=payload; Path=/;"));
		assert!(cookie.contains("; HttpOnly; SameSite=Lax; Secure"));
		assert!(!cookie.contains("Domain="));
	}

	#[test]
	fn test_http_state_cookie_path_includes_base_path() {
		let cookie =
			oidc_state_cookie("payload", false, OIDC_STATE_TTL_SECONDS, "/stump")
				.unwrap();
		assert!(
			cookie
				.to_str()
				.unwrap()
				.contains("; Path=/stump/api/v2/auth/oidc;")
		);
	}

	async fn setup_db(public_url: Option<&str>) -> sea_orm::DatabaseConnection {
		let db = test_database().await;

		server_config::ActiveModel {
			public_url: Set(public_url.map(str::to_string)),
			..Default::default()
		}
		.insert(&db)
		.await
		.expect("Failed to insert server_config row");

		db
	}

	fn service() -> HostDetails {
		HostDetails {
			host: "stump.example.com".to_string(),
			scheme: "https".to_string(),
			base_path: String::new(),
		}
	}

	#[tokio::test]
	async fn test_unset_public_url_includes_subpath() {
		let db = setup_db(None).await;
		let mut service = service();
		service.base_path = "/stump".to_string();
		assert_eq!(
			get_frontend_url(&db, service).await.unwrap(),
			"https://stump.example.com/stump"
		);
	}

	#[test]
	fn public_url_includes_base_path_without_duplicating_it() {
		assert_eq!(
			append_base_path("https://stump.example.com", "/stump"),
			"https://stump.example.com/stump"
		);
		assert_eq!(
			append_base_path("https://stump.example.com/proxy", "/stump"),
			"https://stump.example.com/proxy/stump"
		);
		assert_eq!(
			append_base_path("https://stump.example.com/stump/", "/stump"),
			"https://stump.example.com/stump/"
		);
		assert_eq!(
			append_base_path("https://stump.example.com", ""),
			"https://stump.example.com"
		);
	}

	#[tokio::test]
	async fn test_missing_config_errors() {
		let db = test_database().await;

		assert!(get_frontend_url(&db, service()).await.is_err());
	}

	#[tokio::test]
	async fn test_unset_public_url_falls_back_to_request_host() {
		let db = setup_db(None).await;

		let url = get_frontend_url(&db, service()).await.unwrap();
		assert_eq!(url, "https://stump.example.com");
	}

	#[tokio::test]
	async fn test_blank_public_url_is_treated_as_unset() {
		for blank in ["", " "] {
			let db = setup_db(Some(blank)).await;

			let url = get_frontend_url(&db, service()).await.unwrap();
			assert_eq!(
				url, "https://stump.example.com",
				"blank public_url '{blank}' should fall back to the request host"
			);
		}
	}

	#[tokio::test]
	async fn test_public_url_takes_precedence_and_is_trimmed() {
		let db = setup_db(Some("https://public.example.com/")).await;

		let url = get_frontend_url(&db, service()).await.unwrap();
		assert_eq!(url, "https://public.example.com");
	}
}
