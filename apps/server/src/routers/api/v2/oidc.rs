use axum::{
	extract::{Query, State},
	response::Redirect,
	routing::get,
	Json, Router,
};
use models::entity::{server_config, user, user_preferences};
use sea_orm::{
	ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, PaginatorTrait,
	QueryFilter, Set, TransactionTrait,
};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;

use crate::{
	config::{
		jwt::{create_jwt_auth, JwtTokenPair},
		oidc::{create_oidc_client, exchange_code_for_claims, get_oidc_authorize_url},
		session::SESSION_USER_KEY,
		state::AppState,
	},
	errors::{APIError, APIResult},
	middleware::host::{HostDetails, HostExtractor},
	routers::enforce_max_sessions,
};

pub(crate) fn mount() -> Router<AppState> {
	Router::new().nest(
		"/auth/oidc",
		Router::new()
			.route("/config", get(get_oidc_config))
			.route("/authorize", get(authorize))
			.route("/callback", get(callback)),
	)
}

#[derive(Debug, Serialize)]
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
				oidc.is_configured(),
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

/// Initiate OIDC authorization
/// The frontend(s) redirects to this endpoint so the backend can generate the auth URL
/// and then redirect the user again to the provider
async fn authorize(
	State(ctx): State<AppState>,
	HostExtractor(service): HostExtractor,
	Query(query): Query<AuthorizeQuery>,
) -> Result<Redirect, APIError> {
	let config = &*ctx.config;

	let oidc_config = config
		.oidc
		.as_ref()
		.filter(|c| c.is_configured())
		.ok_or_else(|| APIError::BadRequest("OIDC is not configured".to_string()))?;

	if !oidc_config.enabled {
		return Err(APIError::OIDCNotEnabled);
	}

	let frontend_url = get_frontend_url(&ctx.conn, service).await?;

	let (_http_client, client) = create_oidc_client(oidc_config, &frontend_url)
		.await
		.map_err(|e| {
			tracing::error!("Failed to create OIDC client: {:?}", e);
			APIError::InternalServerError("Failed to initialize OIDC".to_string())
		})?;

	let state_value = serde_json::to_string(&query).map_err(|error| {
		tracing::error!(?error, "Failed to encode state parameter");
		APIError::InternalServerError("Failed to encode state".to_string())
	})?;

	let redirect_to =
		get_oidc_authorize_url(&client, &oidc_config.get_scopes(), &state_value);

	tracing::debug!(
		generate_token = %query.generate_token,
		?redirect_to,
		"Redirecting to OIDC provider",
	);

	Ok(Redirect::temporary(&redirect_to))
}

#[derive(Debug, Deserialize)]
pub struct CallbackQuery {
	pub code: String,
	pub state: Option<String>,
}

#[derive(Debug)]
pub enum OidcCallbackResponse {
	Token(JwtTokenPair),
	Redirect(Redirect),
}

impl axum::response::IntoResponse for OidcCallbackResponse {
	fn into_response(self) -> axum::response::Response {
		match self {
			OidcCallbackResponse::Token(token) => Json(token).into_response(),
			OidcCallbackResponse::Redirect(redirect) => redirect.into_response(),
		}
	}
}

fn parse_state(state: Option<&str>) -> AuthorizeQuery {
	state
		.and_then(|s| serde_json::from_str::<AuthorizeQuery>(s).ok())
		.unwrap_or_default()
}

/// The handler for the OIDC callback (code exchange + user creation/login)
/// Provider redirects here with code, we exchange for tokens and create session or return JWT
async fn callback(
	State(ctx): State<AppState>,
	HostExtractor(service): HostExtractor,
	session: Session,
	Query(query): Query<CallbackQuery>,
) -> Result<OidcCallbackResponse, APIError> {
	let config = &*ctx.config;

	let authorize_query = parse_state(query.state.as_deref());
	let generate_token = authorize_query.generate_token;

	let oidc_config = config
		.oidc
		.as_ref()
		.filter(|c| c.is_configured())
		.ok_or_else(|| APIError::BadRequest("OIDC is not configured".to_string()))?;

	if !oidc_config.enabled {
		return Err(APIError::OIDCNotEnabled);
	}

	let base_url = get_frontend_url(&ctx.conn, service).await?;

	let (http_client, client) = create_oidc_client(oidc_config, &base_url)
		.await
		.map_err(|e| {
			tracing::error!("Failed to create OIDC client: {:?}", e);
			APIError::InternalServerError("Failed to initialize OIDC".to_string())
		})?;

	let claims = exchange_code_for_claims(&http_client, &client, query.code)
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
		// TODO(oidc): Update avatar_url if it changed from the provider? Idk if that would be desired behavior. The problem
		// could be if I update my avatar in Stump then it gets overwritten by the provider on next login. I would want to avoid that.
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

		let tx = ctx.conn.begin().await?;

		let active_model = user::ActiveModel {
			username: Set(username),
			hashed_password: Set(String::new()), // OIDC users don't have a password
			oidc_issuer_id: Set(Some(claims.subject.clone())),
			oidc_email: Set(Some(claims.email.clone())),
			avatar_url: Set(claims.picture.clone()),
			is_server_owner: Set(is_server_owner),
			..Default::default()
		};
		let created_user = active_model.insert(&tx).await?;
		let created_user_preferences = user_preferences::ActiveModel {
			user_id: Set(Some(created_user.id.clone())),
			..Default::default()
		}
		.insert(&tx)
		.await?;

		let mut updated_user = created_user.into_active_model();
		updated_user.user_preferences_id = Set(Some(created_user_preferences.id));

		let user = updated_user.update(&tx).await?;

		tx.commit().await?;

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

		if let Some(redirect_uri) = authorize_query.redirect_uri {
			let redirect_url = format!(
				"{}?access_token={}&refresh_token={}&expires_at={}",
				redirect_uri,
				urlencoding::encode(&token.access_token),
				urlencoding::encode(&token.refresh_token.unwrap_or_default()),
				token.expires_at
			);
			tracing::debug!(user_id = %user_model.id, "Redirecting mobile app with tokens");
			Ok(OidcCallbackResponse::Redirect(Redirect::temporary(
				&redirect_url,
			)))
		} else {
			Ok(OidcCallbackResponse::Token(token))
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
		Ok(OidcCallbackResponse::Redirect(Redirect::temporary("/")))
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

async fn get_frontend_url(
	conn: &sea_orm::DatabaseConnection,
	service: HostDetails,
) -> APIResult<String> {
	let config = server_config::Entity::find().one(conn).await?.ok_or(
		APIError::InternalServerError("Missing server config".to_string()),
	)?;
	Ok(config.public_url.unwrap_or_else(|| service.url()))
}
