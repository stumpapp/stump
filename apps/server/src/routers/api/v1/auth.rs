use axum::{
	extract::{ConnectInfo, Query, State},
	http::{Response, StatusCode},
	middleware,
	response::IntoResponse,
	routing::{get, post},
	Extension, Json, Router,
};
use axum_extra::{headers::UserAgent, TypedHeader};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use prisma_client_rust::Direction;
use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::{
	db::entity::User,
	prisma::{session, user, user_login_activity, user_preferences, PrismaClient},
};
use tower_sessions::Session;
use tracing::error;

use crate::{
	config::{
		jwt::{create_user_jwt, CreatedToken},
		session::{delete_cookie_header, SESSION_USER_KEY},
		state::AppState,
	},
	errors::{api_error_message, APIError, APIResult},
	http_server::StumpRequestInfo,
	middleware::auth::{auth_middleware, AuthContext},
	utils::{default_true, get_session_user, hash_password, verify_password},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new().nest(
		"/auth",
		Router::new()
			.route(
				"/me",
				get(viewer)
					.layer(middleware::from_fn_with_state(app_state, auth_middleware)),
			)
			.route("/login", post(login))
			.route("/logout", post(logout))
			.route("/register", post(register)),
	)
}

pub async fn enforce_max_sessions(
	for_user: &user::Data,
	db: &PrismaClient,
) -> APIResult<()> {
	let existing_sessions = for_user
		.sessions()
		.cloned()
		.unwrap_or_else(|error| {
			tracing::error!(?error, "Failed to load user's existing session(s)");
			Vec::default()
		})
		.clone();
	let existing_login_sessions_count = existing_sessions.len() as i32;

	match (for_user.max_sessions_allowed, existing_login_sessions_count) {
		(Some(max_login_sessions), count) if count >= max_login_sessions => {
			let oldest_session_id = existing_sessions
				.iter()
				.min_by_key(|session| session.expiry_time)
				.map(|session| session.id.clone());
			handle_remove_earliest_session(db, for_user.id.clone(), oldest_session_id)
				.await?;
		},
		_ => (),
	}

	Ok(())
}

#[derive(Deserialize, Type)]
pub struct LoginOrRegisterArgs {
	pub username: String,
	pub password: String,
}

#[derive(Debug, Deserialize, Type)]
pub struct AuthenticationOptions {
	#[serde(default)]
	generate_token: bool,
	#[serde(default = "default_true")]
	create_session: bool,
}

#[utoipa::path(
	get,
	path = "/api/v1/auth/me",
	tag = "auth",
	responses(
		(status = 200, description = "Returns the currently logged in user from the session.", body = User),
		(status = 401, description = "No user is logged in (unauthorized).")
	)
)]
/// Returns the currently logged in user from the session. If no user is logged in, returns an
/// unauthorized error.
async fn viewer(Extension(req): Extension<AuthContext>) -> APIResult<Json<User>> {
	Ok(Json(req.user().clone()))
}

async fn handle_login_attempt(
	client: &PrismaClient,
	for_user: user::Data,
	user_agent: UserAgent,
	request_info: StumpRequestInfo,
	success: bool,
) -> APIResult<user_login_activity::Data> {
	let login_activity = client
		.user_login_activity()
		.create(
			request_info.ip_addr.to_string(),
			user_agent.to_string(),
			success,
			user::id::equals(for_user.id),
			vec![],
		)
		.exec()
		.await?;
	Ok(login_activity)
}

async fn handle_remove_earliest_session(
	client: &PrismaClient,
	for_user_id: String,
	session_id: Option<String>,
) -> APIResult<i32> {
	if let Some(oldest_session_id) = session_id {
		let deleted_session = client
			.session()
			.delete(session::id::equals(oldest_session_id))
			.exec()
			.await?;
		tracing::trace!(?deleted_session, "Removed oldest session for user");
		Ok(1)
	} else {
		tracing::warn!("No existing session ID was provided for enforcing the maximum number of sessions. Deleting all sessions for user instead.");
		let deleted_sessions_count = client
			.session()
			.delete_many(vec![session::user_id::equals(for_user_id)])
			.exec()
			.await?;
		Ok(deleted_sessions_count as i32)
	}
}

#[derive(Debug, Serialize, Type)]
#[serde(untagged)]
pub enum LoginResponse {
	User(User),
	AccessToken { for_user: User, token: CreatedToken },
}

#[utoipa::path(
	post,
	path = "/api/v1/auth/login",
	tag = "auth",
	request_body = LoginOrRegisterArgs,
	responses(
		(status = 200, description = "Authenticates the user and returns the user object.", body = User),
		(status = 401, description = "Invalid username or password."),
		(status = 500, description = "An internal server error occurred.")
	)
)]
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
	Json(input): Json<LoginOrRegisterArgs>,
) -> APIResult<Json<LoginResponse>> {
	match get_session_user(&session).await? {
		Some(user) if user.username == input.username => {
			// TODO: should this be tracked?
			// TODO: should this be permission gated?
			if generate_token {
				let token = create_user_jwt(&user.id, &state.config)?;
				return Ok(Json(LoginResponse::AccessToken {
					for_user: user,
					token,
				}));
			}

			return Ok(Json(LoginResponse::User(user)));
		},
		_ => {},
	}

	let client = state.db.clone();
	let today: DateTime<FixedOffset> = Utc::now().into();
	// TODO: make this configurable via environment variable so knowledgeable attackers can't bypass this
	let twenty_four_hours_ago = today - Duration::hours(24);

	let fetch_result = client
		.user()
		.find_first(vec![
			user::username::equals(input.username.to_owned()),
			user::deleted_at::equals(None),
		])
		.with(user::user_preferences::fetch())
		.with(user::age_restriction::fetch())
		.with(
			user::login_activity::fetch(vec![
				user_login_activity::timestamp::gte(twenty_four_hours_ago),
				user_login_activity::timestamp::lte(today),
			])
			.order_by(user_login_activity::timestamp::order(Direction::Desc))
			.take(10),
		)
		.with(user::sessions::fetch(vec![session::expiry_time::gt(
			Utc::now().into(),
		)]))
		.exec()
		.await?;

	match fetch_result {
		Some(db_user)
			if db_user.is_locked
				&& verify_password(&db_user.hashed_password, &input.password)? =>
		{
			Err(APIError::Forbidden(
				api_error_message::LOCKED_ACCOUNT.to_string(),
			))
		},
		Some(db_user) if !db_user.is_locked => {
			let user_id = db_user.id.clone();
			let matches = verify_password(&db_user.hashed_password, &input.password)?;
			if !matches {
				// TODO: make this configurable via environment variable so knowledgeable attackers can't bypass this
				let should_lock_account = db_user
					.login_activity
					.as_ref()
					// If there are 9 or more failed login attempts _in a row_, within a 24 hour period, lock the account
					.map(|activity| {
						!activity
							.iter()
							.any(|activity| activity.authentication_successful)
							&& activity.len() >= 9
					})
					.unwrap_or(false);

				handle_login_attempt(&client, db_user, user_agent, request_info, false)
					.await?;

				if should_lock_account {
					let _locked_user = client
						.user()
						.update(
							user::id::equals(user_id.clone()),
							vec![user::is_locked::set(true)],
						)
						.exec()
						.await?;

					let removed_sessions_count = client
						.session()
						.delete_many(vec![session::user_id::equals(user_id.clone())])
						.exec()
						.await?;
					tracing::debug!(
						?removed_sessions_count,
						?user_id,
						"Locked user account and removed all associated sessions"
					)
				}

				return Err(APIError::Unauthorized);
			}

			enforce_max_sessions(&db_user, &client).await?;

			let updated_user = state
				.db
				.user()
				.update(
					user::id::equals(db_user.id.clone()),
					vec![user::last_login::set(Some(Utc::now().into()))],
				)
				.with(user::user_preferences::fetch())
				.with(user::age_restriction::fetch())
				.exec()
				.await
				.unwrap_or_else(|err| {
					error!(error = ?err, "Failed to update user last login!");
					user::Data {
						last_login: Some(Utc::now().into()),
						..db_user
					}
				});

			let login_track_result = handle_login_attempt(
				&state.db,
				updated_user.clone(),
				user_agent,
				request_info,
				true,
			)
			.await;
			// I don't want to kill the login here, so not bubbling up the error
			if let Err(err) = login_track_result {
				error!(error = ?err, "Failed to track login attempt!");
			}

			let user = User::from(updated_user);

			if create_session {
				session.insert(SESSION_USER_KEY, user.clone()).await?;
			}

			// TODO: should this be permission gated?
			if generate_token {
				let token = create_user_jwt(&user.id, &state.config)?;
				Ok(Json(LoginResponse::AccessToken {
					for_user: user,
					token,
				}))
			} else {
				Ok(Json(LoginResponse::User(user)))
			}
		},
		_ => Err(APIError::Unauthorized),
	}
}

#[utoipa::path(
	post,
	path = "/api/v1/auth/logout",
	tag = "auth",
	responses(
		(status = 200, description = "Destroys the session and logs the user out."),
		(status = 500, description = "Failed to destroy session.")
	)
)]
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

#[utoipa::path(
	post,
	path = "/api/v1/auth/register",
	tag = "auth",
	request_body = LoginOrRegisterArgs,
	responses(
		(status = 200, description = "Successfully registered new user.", body = User),
		(status = 403, description = "Must be server owner to register member accounts."),
		(status = 500, description = "An internal server error occurred.")
	)
)]
/// Attempts to register a new user. If no users exist in the database, the user is registered as a server owner.
/// Otherwise, the registration is rejected by all users except the server owner.
pub async fn register(
	session: Session,
	State(ctx): State<AppState>,
	Json(input): Json<LoginOrRegisterArgs>,
) -> APIResult<Json<User>> {
	let db = &ctx.db;

	let has_users = db.user().find_first(vec![]).exec().await?.is_some();

	let mut is_server_owner = false;

	let session_user = get_session_user(&session).await?;

	// TODO: move nested if to if let once stable
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

	let created_user = db
		.user()
		.create(
			input.username.clone(),
			hashed_password,
			vec![user::is_server_owner::set(is_server_owner)],
		)
		.exec()
		.await?;

	// TODO(prisma-nested-create): Refactor once nested create is supported
	let _user_preferences = db
		.user_preferences()
		.create(vec![
			user_preferences::user::connect(user::id::equals(created_user.id.clone())),
			user_preferences::user_id::set(Some(created_user.id.clone())),
		])
		.exec()
		.await?;

	let user = db
		.user()
		.find_unique(user::id::equals(created_user.id))
		.with(user::user_preferences::fetch())
		.with(user::age_restriction::fetch())
		.exec()
		.await?
		.ok_or(APIError::InternalServerError(
			"Failed to fetch user after registration.".to_string(),
		))?;

	Ok(Json(user.into()))
}
