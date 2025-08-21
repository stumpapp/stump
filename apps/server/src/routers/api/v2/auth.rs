use axum::{
	extract::{ConnectInfo, Query, Request, State},
	http::{Response, StatusCode},
	middleware,
	response::IntoResponse,
	routing::{get, post},
	Extension, Json, Router,
};
use axum_extra::{headers::UserAgent, TypedHeader};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use graphql::data::AuthContext;
use models::entity::{
	session,
	user::{self, AuthUser, LoginUser},
	user_login_activity, user_preferences,
};
use reqwest::header;
use sea_orm::{prelude::*, IntoActiveModel, TransactionTrait};
use sea_orm::{DatabaseConnection, EntityTrait, Set};
use serde::{Deserialize, Serialize};
use tower_sessions::Session;
use tracing::error;

use crate::{
	config::{
		jwt::{
			create_jwt_auth, exchange_refresh_token, extract_jti_from_refresh_token,
			JwtTokenPair,
		},
		session::{delete_cookie_header, SESSION_USER_KEY},
		state::AppState,
	},
	errors::{APIError, APIResult},
	http_server::StumpRequestInfo,
	middleware::auth::auth_middleware,
	utils::{default_true, fetch_session_user, hash_password, verify_password},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/auth",
		Router::new()
			.route(
				"/me",
				get(viewer).layer(middleware::from_fn_with_state(
					app_state.clone(),
					auth_middleware,
				)),
			)
			.route(
				"/viewer",
				get(viewer)
					.layer(middleware::from_fn_with_state(app_state, auth_middleware)),
			)
			.route("/login", post(login))
			.route("/refresh-token", post(refresh_token))
			.route("/logout", post(logout))
			.route("/register", post(register)),
	)
}

async fn viewer(Extension(req): Extension<AuthContext>) -> APIResult<Json<AuthUser>> {
	Ok(Json(req.user()))
}

pub async fn enforce_max_sessions(
	for_user: &user::LoginUser,
	conn: &DatabaseConnection,
) -> APIResult<()> {
	let existing_sessions = session::Entity::find()
		.filter(session::Column::UserId.eq(for_user.id.clone()))
		.all(conn)
		.await?;
	let existing_login_sessions_count = existing_sessions.len() as i32;
	tracing::trace!(?existing_login_sessions_count, "Existing sessions count");

	match (for_user.max_sessions_allowed, existing_login_sessions_count) {
		(Some(max_login_sessions), count) if count >= max_login_sessions => {
			let oldest_session_id = existing_sessions
				.iter()
				.min_by_key(|session| session.expiry_time)
				.map(|session| session.id);

			handle_remove_earliest_session(conn, for_user.id.clone(), oldest_session_id)
				.await?;
		},
		_ => (),
	}

	Ok(())
}

async fn lock_account(conn: &DatabaseConnection, user_id: String) -> APIResult<()> {
	let affected_rows = user::Entity::update_many()
		.filter(user::Column::Id.eq(user_id.clone()))
		.col_expr(user::Column::IsLocked, Expr::value(true))
		.exec(conn)
		.await?
		.rows_affected;
	tracing::debug!(?affected_rows, "Locked user account");

	let deleted_sessions = session::Entity::delete_many()
		.filter(session::Column::UserId.eq(user_id))
		.exec(conn)
		.await?
		.rows_affected;
	tracing::debug!(?deleted_sessions, "Removed all sessions for locked user");

	Ok(())
}

#[derive(Deserialize)]
pub struct PasswordUserInput {
	pub username: String,
	pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct AuthenticationOptions {
	#[serde(default)]
	generate_token: bool,
	#[serde(default = "default_true")]
	create_session: bool,
}

async fn handle_login_attempt(
	conn: &DatabaseConnection,
	for_user: &user::LoginUser,
	user_agent: UserAgent,
	request_info: StumpRequestInfo,
	success: bool,
) -> APIResult<user_login_activity::Model> {
	let active_model = user_login_activity::ActiveModel {
		user_id: Set(for_user.id.clone()),
		ip_address: Set(request_info.ip_addr.to_string()),
		user_agent: Set(user_agent.to_string()),
		timestamp: Set(Utc::now().into()),
		authentication_successful: Set(success),
		..Default::default()
	};
	let login_activity = active_model.insert(conn).await?;
	tracing::trace!(?login_activity, "Tracked login activity");
	Ok(login_activity)
}

async fn handle_remove_earliest_session(
	conn: &DatabaseConnection,
	for_user_id: String,
	session_id: Option<i32>,
) -> APIResult<u64> {
	if let Some(oldest_session_id) = session_id {
		let affected_rows = session::Entity::delete_by_id(oldest_session_id)
			.filter(session::Column::UserId.eq(for_user_id))
			.exec(conn)
			.await?
			.rows_affected;
		tracing::trace!(?affected_rows, "Removed oldest session for user");
		Ok(affected_rows)
	} else {
		tracing::warn!("Deleting all sessions for user");
		let deleted_sessions = session::Entity::delete_many()
			.filter(session::Column::UserId.eq(for_user_id))
			.exec(conn)
			.await?
			.rows_affected;
		tracing::trace!(?deleted_sessions, "Removed all sessions for user");
		Ok(deleted_sessions)
	}
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedToken {
	#[serde(flatten)]
	token: JwtTokenPair,
	for_user: AuthUser,
}

#[derive(Debug, Serialize)]
#[serde(untagged, rename_all = "camelCase")]
pub enum LoginResponse {
	User(AuthUser),
	AccessToken(GeneratedToken),
}

/// Authenticates the user and returns the user object. If the user is already logged in, returns the
/// user object from the session.
async fn login(
	TypedHeader(user_agent): TypedHeader<UserAgent>,
	ConnectInfo(request_info): ConnectInfo<StumpRequestInfo>,
	session: Session,
	State(state): State<AppState>,
	Query(AuthenticationOptions {
		generate_token,
		create_session,
	}): Query<AuthenticationOptions>,
	Json(PasswordUserInput { username, password }): Json<PasswordUserInput>,
) -> APIResult<Json<LoginResponse>> {
	let user = LoginUser::find()
		.filter(
			user::Column::Username
				.eq(username)
				.and(user::Column::DeletedAt.is_null()),
		)
		.into_model::<LoginUser>()
		.one(state.conn.as_ref())
		.await?
		.ok_or(APIError::Unauthorized)?;

	match session.get::<String>(SESSION_USER_KEY).await? {
		Some(user_id) if user_id == user.id && !user.is_locked => {
			// TODO: should this be tracked?
			// TODO: should this be permission gated?
			if generate_token {
				let token = create_jwt_auth(&user.id, state.clone()).await?;
				return Ok(Json(LoginResponse::AccessToken(GeneratedToken {
					for_user: user.into(),
					token,
				})));
			}

			// The user already has a session, so we just return them immediately
			return Ok(Json(LoginResponse::User(user.into())));
		},
		_ => {},
	}

	let today: DateTime<FixedOffset> = Utc::now().into();
	// TODO: make this configurable via environment variable so knowledgeable attackers can't bypass this
	let twenty_four_hours_ago = today - Duration::hours(24);

	let provided_valid_credentials = verify_password(&user.hashed_password, &password)?;

	if user.is_locked && provided_valid_credentials {
		return Err(APIError::AccountLocked);
	} else if user.is_locked {
		return Err(APIError::Unauthorized);
	}

	let should_lock_account = !provided_valid_credentials && {
		user_login_activity::Entity::find()
			.filter(
				user_login_activity::Column::UserId
					.eq(user.id.clone())
					.and(
						user_login_activity::Column::Timestamp
							.gte(twenty_four_hours_ago)
							.and(user_login_activity::Column::Timestamp.lte(today)),
					)
					.and(user_login_activity::Column::AuthenticationSuccessful.eq(false)),
			)
			.count(state.conn.as_ref())
			.await? >= 9
	};

	let login_track_result = handle_login_attempt(
		state.conn.as_ref(),
		&user,
		user_agent,
		request_info,
		provided_valid_credentials,
	)
	.await;
	// I don't want to kill the login here, so not bubbling up the error
	if let Err(err) = login_track_result {
		error!(error = ?err, "Failed to track login attempt!");
	}

	if should_lock_account {
		lock_account(state.conn.as_ref(), user.id.clone()).await?;
	}

	if !provided_valid_credentials {
		return Err(APIError::Unauthorized);
	}

	if create_session {
		enforce_max_sessions(&user, state.conn.as_ref()).await?;
	}

	let auth_user = AuthUser::from(user);

	if create_session {
		session
			.insert(SESSION_USER_KEY, auth_user.id.clone())
			.await?;
	}

	// TODO: should this be permission gated?
	if generate_token {
		let token = create_jwt_auth(&auth_user.id, state.clone()).await?;
		Ok(Json(LoginResponse::AccessToken(GeneratedToken {
			for_user: auth_user,
			token,
		})))
	} else {
		Ok(Json(LoginResponse::User(auth_user)))
	}
}

/// Destroys the session and logs the user out.
async fn logout(session: Session) -> APIResult<impl IntoResponse> {
	session.delete().await?;

	let body = serde_json::json!({
		"status": 200,
		"message": "OK",
	});

	let base_response = Json(body).into_response();

	let (name, value) = delete_cookie_header();
	let builder = Response::builder()
		.status(200)
		.header("Content-Type", "application/json")
		.header(name, value);

	Ok(builder
		.body(base_response.into_body())
		.unwrap_or_else(|error| {
			tracing::error!(?error, "Failed to build response");
			(StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response()
		}))
}

/// Attempts to register a new user. If no users exist in the database, the user is registered as a server owner.
/// Otherwise, the registration is rejected by all users except the server owner.
pub async fn register(
	session: Session,
	State(ctx): State<AppState>,
	Json(input): Json<PasswordUserInput>,
) -> APIResult<Json<AuthUser>> {
	let conn = ctx.conn.as_ref();
	let has_users = user::Entity::find()
		.filter(user::Column::DeletedAt.is_null())
		.count(conn)
		.await?
		> 0;

	let mut is_server_owner = false;

	let session_user = fetch_session_user(&session, ctx.conn.as_ref()).await?;

	if let Some(user) = session_user {
		if !user.is_server_owner {
			return Err(APIError::Forbidden(String::from(
				"You do not have permission to access this resource.",
			)));
		}
	} else if session_user.is_none() && has_users {
		// if users exist, a valid session is required to register a new user
		return Err(APIError::Unauthorized);
	} else if !has_users {
		// if no users present, the user is automatically a server owner
		is_server_owner = true;
	}

	let hashed_password = hash_password(&input.password, &ctx.config)?;

	let tx = conn.begin().await?;

	let active_model = user::ActiveModel {
		username: Set(input.username.clone()),
		hashed_password: Set(hashed_password),
		is_server_owner: Set(is_server_owner),
		..Default::default()
	};
	let created_user = active_model.insert(&tx).await?;

	let active_model = user_preferences::ActiveModel {
		user_id: Set(Some(created_user.id.clone())),
		..Default::default()
	};
	let created_user_preferences = active_model.insert(&tx).await?;

	// Write back the preferences ID to the user
	let mut updated_user = created_user.into_active_model();
	updated_user.user_preferences_id = Set(Some(created_user_preferences.id));
	let updated_user = updated_user.update(&tx).await?;

	let auth_user = user::LoginUser::find()
		.filter(user::Column::Id.eq(updated_user.id.clone()))
		.into_model::<user::LoginUser>()
		.one(&tx)
		.await?
		.ok_or(APIError::InternalServerError(
			"Failed to fetch user after registration.".to_string(),
		))?;

	tx.commit().await?;

	let auth_user = AuthUser::from(auth_user);

	Ok(Json(auth_user))
}

/// Exchange a refresh token for a new access token and refresh token pair. This endpoint
/// expects a valid refresh token in the Authorization header as a Bearer token. The
/// access token should not be used for this endpoint.
async fn refresh_token(
	State(state): State<AppState>,
	req: Request,
) -> Result<Json<JwtTokenPair>, APIError> {
	let req_headers = req.headers().clone();
	let auth_header = req_headers
		.get(header::AUTHORIZATION)
		.and_then(|header| header.to_str().ok())
		.ok_or(APIError::Unauthorized)?;

	if auth_header.starts_with("Bearer ") {
		let token = auth_header.trim_start_matches("Bearer ").to_string();
		let jti = extract_jti_from_refresh_token(&token)?;
		let jwt_pair = exchange_refresh_token(&jti, state).await?;
		return Ok(Json(jwt_pair));
	}

	Err(APIError::Unauthorized)
}
