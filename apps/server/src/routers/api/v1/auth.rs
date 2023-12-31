use axum::{
	extract::{ConnectInfo, State},
	headers::UserAgent,
	routing::{get, post},
	Json, Router, TypedHeader,
};
use prisma_client_rust::{
	chrono::{DateTime, Duration, FixedOffset, Utc},
	Direction,
};
use serde::Deserialize;
use specta::Type;
use stump_core::{
	db::entity::User,
	prisma::{session, user, user_login_activity, user_preferences, PrismaClient},
};
use tower_sessions::{session::SessionDeletion, Session};
use tracing::error;
use utoipa::ToSchema;

use crate::{
	config::{session::SESSION_USER_KEY, state::AppState},
	errors::{ApiError, ApiResult},
	http_server::StumpRequestInfo,
	utils::verify_password,
};

pub(crate) fn mount() -> Router<AppState> {
	Router::new().nest(
		"/auth",
		Router::new()
			.route("/me", get(viewer))
			.route("/login", post(login))
			.route("/logout", post(logout))
			.route("/register", post(register)),
	)
}

#[derive(Deserialize, Type, ToSchema)]
pub struct LoginOrRegisterArgs {
	pub username: String,
	pub password: String,
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
async fn viewer(session: Session) -> ApiResult<Json<User>> {
	if let Some(user) = session.get::<User>(SESSION_USER_KEY)? {
		Ok(Json(user))
	} else {
		Err(ApiError::Unauthorized)
	}
}

async fn handle_login_attempt(
	client: &PrismaClient,
	for_user: user::Data,
	user_agent: UserAgent,
	request_info: StumpRequestInfo,
	success: bool,
) -> ApiResult<user_login_activity::Data> {
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
) -> ApiResult<i32> {
	if let Some(oldest_session_id) = session_id {
		let _deleted_session = client
			.session()
			.delete(session::id::equals(oldest_session_id))
			.exec()
			.await?;
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
	Json(input): Json<LoginOrRegisterArgs>,
) -> ApiResult<Json<User>> {
	if let Some(user) = session.get::<User>(SESSION_USER_KEY)? {
		if input.username == user.username {
			return Ok(Json(user));
		}
	}

	let client = state.db.clone();
	let today: DateTime<FixedOffset> = Utc::now().into();
	// TODO: make this configurable via environment variable so knowledgable attackers can't bypass this
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
		.with(user::sessions::fetch(vec![session::expires_at::gt(
			Utc::now().into(),
		)]))
		.exec()
		.await?;

	match fetch_result {
		Some(db_user)
			if db_user.is_locked
				&& verify_password(&db_user.hashed_password, &input.password)? =>
		{
			Err(ApiError::Forbidden(
				"Account is locked. Please contact an administrator to unlock your account."
					.to_string(),
			))
		},
		Some(db_user) if !db_user.is_locked => {
			let user_id = db_user.id.clone();
			let matches = verify_password(&db_user.hashed_password, &input.password)?;
			if !matches {
				// TODO: make this configurable via environment variable so knowledgable attackers can't bypass this
				let should_lock_account = db_user
					.login_activity
					.as_ref()
					// If there are 9 or more failed login attempts _in a row_, within a 24 hour period, lock the account
					.map(|activity| !activity.iter().any(|activity| activity.authentication_successful) && activity.len() >= 9)
					.unwrap_or(false);

				handle_login_attempt(&client, db_user, user_agent, request_info, false)
					.await?;

				if should_lock_account {
					client
						.user()
						.update(
							user::id::equals(user_id),
							vec![user::is_locked::set(true)],
						)
						.exec()
						.await?;
				}

				return Err(ApiError::Unauthorized);
			}

			let existing_sessions = db_user
				.sessions()
				.cloned()
				.unwrap_or_else(|error| {
					tracing::error!(?error, "Failed to load user's existing session(s)");
					Vec::default()
				})
				.to_owned();
			let existing_login_sessions_count = existing_sessions.len() as i32;

			match (db_user.max_sessions_allowed, existing_login_sessions_count) {
				(Some(max_login_sessions), count) if count >= max_login_sessions => {
					let oldest_session_id = existing_sessions.iter().min_by_key(|session| session.expires_at).map(|session| session.id.clone());
					handle_remove_earliest_session(&state.db, db_user.id.clone(), oldest_session_id).await?;
				},
				_ => (),
			}

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
			session
				.insert(SESSION_USER_KEY, user.clone())
				.expect("Failed to write user to session");

			Ok(Json(user))
		},
		_ => Err(ApiError::Unauthorized),
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
async fn logout(session: Session) -> ApiResult<()> {
	session.delete();
	if !matches!(session.deleted(), Some(SessionDeletion::Deleted)) {
		return Err(ApiError::InternalServerError(
			"Failed to destroy session".to_string(),
		));
	}
	Ok(())
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
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();

	let has_users = db.user().find_first(vec![]).exec().await?.is_some();

	let mut is_server_owner = false;

	let session_user = session.get::<User>(SESSION_USER_KEY)?;

	// TODO: move nested if to if let once stable
	if let Some(user) = session_user {
		if !user.is_server_owner {
			return Err(ApiError::Forbidden(String::from(
				"You do not have permission to access this resource.",
			)));
		}
	} else if session_user.is_none() && has_users {
		// if users exist, a valid session is required to register a new user
		return Err(ApiError::Unauthorized);
	} else if !has_users {
		// if no users present, the user is automatically a server owner
		is_server_owner = true;
	}

	let hashed_password = bcrypt::hash(&input.password, ctx.config.password_hash_cost)?;

	let created_user = db
		.user()
		.create(
			input.username.to_owned(),
			hashed_password,
			vec![user::is_server_owner::set(is_server_owner)],
		)
		.exec()
		.await?;

	// FIXME: these next two queries will be removed once nested create statements are
	// supported on the prisma client. Until then, this ugly mess is necessary.
	let _user_preferences = db
		.user_preferences()
		.create(vec![user_preferences::user::connect(user::id::equals(
			created_user.id.clone(),
		))])
		.exec()
		.await?;

	// This *really* shouldn't fail, so I am using expect here. It also doesn't
	// matter too much in the long run since this query will go away once above fixme
	// is resolved.
	let user = db
		.user()
		.find_unique(user::id::equals(created_user.id))
		.with(user::user_preferences::fetch())
		.with(user::age_restriction::fetch())
		.exec()
		.await?
		.expect("Failed to fetch user after registration.");

	Ok(Json(user.into()))
}
