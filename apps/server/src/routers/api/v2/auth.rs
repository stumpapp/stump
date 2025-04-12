use axum::{
	extract::{ConnectInfo, Query, State},
	http::{Response, StatusCode},
	response::IntoResponse,
	routing::post,
	Json, Router,
};
use axum_extra::{headers::UserAgent, TypedHeader};
use chrono::{DateTime, Duration, FixedOffset, Utc};
use models::entity::{
	user::{self, AuthUser},
	user_login_activity, user_preferences,
};
use sea_orm::prelude::*;
use sea_orm::{DatabaseConnection, EntityTrait, Set};
use serde::{Deserialize, Serialize};
use specta::Type;
use tower_sessions::Session;
use tracing::error;
use utoipa::ToSchema;

use crate::{
	config::{
		jwt::{create_user_jwt, CreatedToken},
		session::{delete_cookie_header, SESSION_USER_KEY},
		state::AppState,
	},
	errors::{api_error_message, APIError, APIResult},
	http_server::StumpRequestInfo,
	utils::{default_true, get_session_user, hash_password, verify_password},
};

pub(crate) fn mount() -> Router<AppState> {
	Router::new().nest(
		"/auth",
		Router::new()
			.route("/login", post(login))
			.route("/logout", post(logout))
			.route("/register", post(register)),
	)
}

pub async fn enforce_max_sessions(
	for_user: &user::LoginUser,
	conn: &DatabaseConnection,
) -> APIResult<()> {
	// let existing_sessions = for_user
	// 	.sessions()
	// 	.cloned()
	// 	.unwrap_or_else(|error| {
	// 		tracing::error!(?error, "Failed to load user's existing session(s)");
	// 		Vec::default()
	// 	})
	// 	.clone();
	// let existing_login_sessions_count = existing_sessions.len() as i32;

	// match (for_user.max_sessions_allowed, existing_login_sessions_count) {
	// 	(Some(max_login_sessions), count) if count >= max_login_sessions => {
	// 		let oldest_session_id = existing_sessions
	// 			.iter()
	// 			.min_by_key(|session| session.expiry_time)
	// 			.map(|session| session.id.clone());
	// 		handle_remove_earliest_session(db, for_user.id.clone(), oldest_session_id)
	// 			.await?;
	// 	},
	// 	_ => (),
	// }

	// Ok(())
	unimplemented!()
}

#[derive(Deserialize, Type, ToSchema)]
pub struct LoginOrRegisterArgs {
	pub username: String,
	pub password: String,
}

#[derive(Debug, Deserialize, Type, ToSchema)]
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
	// let login_activity = client
	// 	.user_login_activity()
	// 	.create(
	// 		request_info.ip_addr.to_string(),
	// 		user_agent.to_string(),
	// 		success,
	// 		user::id::equals(for_user.id),
	// 		vec![],
	// 	)
	// 	.exec()
	// 	.await?;
	// Ok(login_activity)
	unimplemented!()
}

async fn handle_remove_earliest_session(
	conn: &DatabaseConnection,
	for_user_id: String,
	session_id: Option<String>,
) -> APIResult<i32> {
	// if let Some(oldest_session_id) = session_id {
	// 	let deleted_session = client
	// 		.session()
	// 		.delete(session::id::equals(oldest_session_id))
	// 		.exec()
	// 		.await?;
	// 	tracing::trace!(?deleted_session, "Removed oldest session for user");
	// 	Ok(1)
	// } else {
	// 	tracing::warn!("No existing session ID was provided for enforcing the maximum number of sessions. Deleting all sessions for user instead.");
	// 	let deleted_sessions_count = client
	// 		.session()
	// 		.delete_many(vec![session::user_id::equals(for_user_id)])
	// 		.exec()
	// 		.await?;
	// 	Ok(deleted_sessions_count as i32)
	// }
	unimplemented!()
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum LoginResponse {
	User(AuthUser),
	AccessToken {
		for_user: AuthUser,
		token: CreatedToken,
	},
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

	let today: DateTime<FixedOffset> = Utc::now().into();
	// TODO: make this configurable via environment variable so knowledgeable attackers can't bypass this
	let twenty_four_hours_ago = today - Duration::hours(24);

	let conn = state.conn.as_ref();

	let fetch_result = user::LoginUser::find()
		.filter(
			user::Column::Username
				.eq(input.username.to_owned())
				.and(user::Column::DeletedAt.is_null()),
		)
		.into_model::<user::LoginUser>()
		.one(conn)
		.await?;

	match fetch_result {
		Some(user)
			if user.is_locked
				&& verify_password(&user.hashed_password, &input.password)? =>
		{
			Err(APIError::Forbidden(
				api_error_message::LOCKED_ACCOUNT.to_string(),
			))
		},
		Some(user) if !user.is_locked => {
			let user_id = user.id.clone();
			let matches = verify_password(&user.hashed_password, &input.password)?;

			let should_lock_account = !matches && {
				user_login_activity::Entity::find()
					.filter(
						user_login_activity::Column::UserId
							.eq(user_id.clone())
							.and(
								user_login_activity::Column::Timestamp
									.gte(twenty_four_hours_ago)
									.and(
										user_login_activity::Column::Timestamp.lte(today),
									),
							)
							.and(
								user_login_activity::Column::AuthenticationSuccessful
									.eq(false),
							),
					)
					.count(conn)
					.await? >= 9
			};

			let login_track_result =
				handle_login_attempt(conn, &user, user_agent, request_info, matches)
					.await;
			// I don't want to kill the login here, so not bubbling up the error
			if let Err(err) = login_track_result {
				error!(error = ?err, "Failed to track login attempt!");
			}

			if should_lock_account {
				let _locked_user = user::Entity::update_many()
					.filter(user::Column::Id.eq(user_id.clone()))
					.col_expr(user::Column::IsLocked, Expr::value(true))
					.exec(conn)
					.await?;

				let removed_sessions = user::Entity::delete_many()
					.filter(user::Column::Id.eq(user_id.clone()))
					.exec(conn)
					.await?
					.rows_affected;
				tracing::debug!(
					?removed_sessions,
					?user_id,
					"Locked user account and removed all associated sessions"
				);
			}

			if !matches {
				return Err(APIError::Unauthorized);
			}

			enforce_max_sessions(&user, conn).await?;

			let auth_user = AuthUser::from(user);

			if create_session {
				session.insert(SESSION_USER_KEY, auth_user.clone()).await?;
			}

			// TODO: should this be permission gated?
			if generate_token {
				let token = create_user_jwt(&auth_user.id, &state.config)?;
				Ok(Json(LoginResponse::AccessToken {
					for_user: auth_user,
					token,
				}))
			} else {
				Ok(Json(LoginResponse::User(auth_user)))
			}
		},

		_ => Err(APIError::Unauthorized),
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
	Json(input): Json<LoginOrRegisterArgs>,
) -> APIResult<Json<AuthUser>> {
	let conn = ctx.conn.as_ref();
	let has_users = user::Entity::find()
		.filter(user::Column::DeletedAt.is_null())
		.count(conn)
		.await?
		> 0;

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

	let active_model = user::ActiveModel {
		username: Set(input.username.clone()),
		hashed_password: Set(hashed_password),
		is_server_owner: Set(is_server_owner),
		..Default::default()
	};
	let created_user = active_model.insert(conn).await?;

	let active_model = user_preferences::ActiveModel {
		user_id: Set(Some(created_user.id.clone())),
		..Default::default()
	};
	let _created_user_preferences = active_model.insert(conn).await?;

	let auth_user = user::LoginUser::find()
		.filter(user::Column::Id.eq(created_user.id.clone()))
		.into_model::<user::LoginUser>()
		.one(conn)
		.await?
		.ok_or(APIError::InternalServerError(
			"Failed to fetch user after registration.".to_string(),
		))?;
	let auth_user = AuthUser::from(auth_user);

	Ok(Json(auth_user))
}
