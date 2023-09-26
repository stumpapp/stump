use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::{get, put},
	Json, Router,
};
use axum_extra::extract::Query;
use axum_sessions::extractors::{ReadableSession, WritableSession};
use prisma_client_rust::{chrono::Utc, Direction};
use stump_core::{
	db::{
		entity::{
			DeleteUser, LoginActivity, UpdateUser, UpdateUserPreferences, User,
			UserPreferences,
		},
		query::pagination::{Pageable, Pagination, PaginationQuery},
	},
	prisma::{user, user_login_activity, user_preferences, PrismaClient},
};
use tracing::{debug, trace};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{
		get_hash_cost, get_session_admin_user, get_session_user,
		get_writable_session_user, UserQueryRelation,
	},
};

use super::auth::LoginOrRegisterArgs;

// TODO: move some of these user operations to the UserDao...

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		// TODO: adminguard these first two routes
		.route("/users", get(get_users).post(create_user))
		.route(
			"/users/login-activity",
			get(get_user_login_activity).delete(delete_user_login_activity),
		)
		.nest(
			"/users/me",
			Router::new()
				.route("/", put(update_current_user))
				.route("/preferences", put(update_current_user_preferences)),
		)
		.nest(
			"/users/:id",
			Router::new()
				.route(
					"/",
					get(get_user_by_id)
						.put(update_user_handler)
						.delete(delete_user_by_id),
				)
				.route("/login-activity", get(get_user_login_activity_by_id))
				.route(
					"/preferences",
					get(get_user_preferences).put(update_user_preferences),
				),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

pub(crate) fn apply_pagination<'a>(
	query: user::FindMany<'a>,
	pagination: &Pagination,
) -> user::FindMany<'a> {
	match pagination {
		Pagination::Page(page_query) => {
			let (skip, take) = page_query.get_skip_take();
			query.skip(skip).take(take)
		},
		Pagination::Cursor(cursor_params) => {
			let mut cursor_query = query;
			if let Some(cursor) = cursor_params.cursor.as_deref() {
				cursor_query = cursor_query
					.cursor(user::id::equals(cursor.to_string()))
					.skip(1);
			}
			if let Some(limit) = cursor_params.limit {
				cursor_query = cursor_query.take(limit);
			}
			cursor_query
		},
		_ => query,
	}
}

#[utoipa::path(
	get,
	path = "/api/v1/users",
	tag = "user",
	params(
		("pagination_query" = Option<PaginationQuery>, Query, description = "The pagination query."),
		("relation_query" = Option<UserQueryRelation>, Query, description = "The relations to include"),
	),
	responses(
		(status = 200, description = "Successfully fetched users.", body = [User]),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_users(
	State(ctx): State<AppState>,
	relation_query: Query<UserQueryRelation>,
	pagination_query: Query<PaginationQuery>,
	session: ReadableSession,
) -> ApiResult<Json<Pageable<Vec<User>>>> {
	get_session_admin_user(&session)?;

	let pagination = pagination_query.0.get();
	let is_unpaged = pagination.is_unpaged();
	let pagination_cloned = pagination.clone();

	tracing::debug!(?relation_query, "get_users");

	let include_user_read_progress =
		relation_query.include_read_progresses.unwrap_or_default();

	let (users, count) = ctx
		.db
		._transaction()
		.run(|client| async move {
			let mut query = client.user().find_many(vec![]);

			if include_user_read_progress {
				query = query.with(user::read_progresses::fetch(vec![]));
			}

			if !is_unpaged {
				query = apply_pagination(query, &pagination_cloned);
			}

			let users = query.exec().await?.into_iter().map(User::from).collect();

			if is_unpaged {
				return Ok((users, None));
			}

			client
				.user()
				.count(vec![])
				.exec()
				.await
				.map(|count| (users, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((users, count, pagination))));
	}

	Ok(Json(Pageable::from(users)))
}

// TODO: pagination!
#[utoipa::path(
	get,
	path = "/api/v1/users/login-activity",
	tag = "user",
	responses(
		(status = 200, description = "Successfully fetched user", body = Vec<LoginActivity>),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn get_user_login_activity(
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Vec<LoginActivity>>> {
	get_session_admin_user(&session)?;

	let client = ctx.get_db();

	let user_activity = client
		.user_login_activity()
		.find_many(vec![])
		.with(user_login_activity::user::fetch())
		.order_by(user_login_activity::timestamp::order(Direction::Desc))
		.exec()
		.await?;

	Ok(Json(
		user_activity.into_iter().map(LoginActivity::from).collect(),
	))
}

#[utoipa::path(
	delete,
	path = "/api/v1/users/login-activity",
	tag = "user",
	responses(
		(status = 200, description = "Successfully deleted user login activity", body = Vec<LoginActivity>),
		(status = 401, description = "Unauthorized"),
		(status = 403, description = "Forbidden"),
		(status = 500, description = "Internal server error"),
	)
)]
async fn delete_user_login_activity(
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<()>> {
	get_session_admin_user(&session)?;

	let client = ctx.get_db();

	client
		.user_login_activity()
		.delete_many(vec![])
		.exec()
		.await?;

	Ok(Json(()))
}

async fn update_user(
	client: &PrismaClient,
	user_id: String,
	input: UpdateUser,
) -> ApiResult<User> {
	let mut update_params = vec![
		user::username::set(input.username),
		user::avatar_url::set(input.avatar_url),
	];
	if let Some(password) = input.password {
		let hashed_password = bcrypt::hash(password, get_hash_cost())?;
		update_params.push(user::hashed_password::set(hashed_password));
	}

	let updated_user_data = client
		.user()
		.update(user::id::equals(user_id), update_params)
		// NOTE: we have to fetch preferences because if we update session without
		// it then it effectively removes the preferences from the session
		.with(user::user_preferences::fetch())
		.exec()
		.await?;

	Ok(User::from(updated_user_data))
}

async fn update_preferences(
	client: &PrismaClient,
	preferences_id: String,
	input: UpdateUserPreferences,
) -> ApiResult<UserPreferences> {
	let updated_preferences = client
		.user_preferences()
		.update(
			user_preferences::id::equals(preferences_id),
			vec![
				user_preferences::locale::set(input.locale.to_owned()),
				user_preferences::library_layout_mode::set(
					input.library_layout_mode.to_owned(),
				),
				user_preferences::series_layout_mode::set(
					input.series_layout_mode.to_owned(),
				),
				user_preferences::app_theme::set(input.app_theme.to_owned()),
				user_preferences::show_query_indicator::set(input.show_query_indicator),
			],
		)
		.exec()
		.await?;

	Ok(UserPreferences::from(updated_preferences))
}

#[utoipa::path(
	post,
	path = "/api/v1/users",
	tag = "user",
	request_body = LoginOrRegisterArgs,
	responses(
		(status = 200, description = "Successfully created user.", body = User),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Creates a new user.
async fn create_user(
	session: ReadableSession,
	State(ctx): State<AppState>,
	Json(input): Json<LoginOrRegisterArgs>,
) -> ApiResult<Json<User>> {
	get_session_admin_user(&session)?;
	let db = ctx.get_db();
	let hashed_password = bcrypt::hash(input.password, get_hash_cost())?;
	let created_user = db
		.user()
		.create(input.username.to_owned(), hashed_password, vec![])
		.exec()
		.await?;

	// FIXME: these next two queries will be removed once nested create statements are
	// supported on the prisma client. Until then, this ugly mess is necessary.
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	let _user_preferences = db
		.user_preferences()
		.create(vec![
			user_preferences::user::connect(user::id::equals(created_user.id.clone())),
			user_preferences::user_id::set(Some(created_user.id.clone())),
		])
		.exec()
		.await?;

	// This *really* shouldn't fail, so I am using unwrap here. It also doesn't
	// matter too much in the long run since this query will go away once above fixme
	// is resolved.
	let user = db
		.user()
		.find_unique(user::id::equals(created_user.id))
		.with(user::user_preferences::fetch())
		.exec()
		.await?
		.unwrap();

	Ok(Json(user.into()))
}

#[utoipa::path(
	put,
	path = "/api/v1/users/me",
	tag = "user",
	request_body = UpdateUser,
	responses(
		(status = 200, description = "Successfully updated user.", body = User),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Updates the session user
async fn update_current_user(
	mut writable_session: WritableSession,
	State(ctx): State<AppState>,
	Json(input): Json<UpdateUser>,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();
	let user = get_writable_session_user(&writable_session)?;

	let updated_user = update_user(db, user.id, input).await?;
	debug!(?updated_user, "Updated user");

	writable_session
		.insert("user", updated_user.clone())
		.map_err(|e| {
			ApiError::InternalServerError(format!("Failed to update session: {}", e))
		})?;

	Ok(Json(updated_user))
}

#[utoipa::path(
	put,
	path = "/api/v1/users/me/preferences",
	tag = "user",
	request_body = UpdateUserPreferences,
	responses(
		(status = 200, description = "Successfully updated user preferences.", body = UserPreferences),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Updates a user's preferences.
async fn update_current_user_preferences(
	mut writable_session: WritableSession,
	State(ctx): State<AppState>,
	Json(input): Json<UpdateUserPreferences>,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();

	let user = get_writable_session_user(&writable_session)?;
	let user_preferences = user.user_preferences.clone().unwrap_or_default();

	trace!(user_id = ?user.id, ?user_preferences, updates = ?input, "Updating viewer's preferences");

	let updated_preferences = update_preferences(db, user_preferences.id, input).await?;
	debug!(?updated_preferences, "Updated user preferences");

	writable_session
		.insert(
			"user",
			User {
				user_preferences: Some(updated_preferences.clone()),
				..user
			},
		)
		.map_err(|e| {
			ApiError::InternalServerError(format!("Failed to update session: {}", e))
		})?;

	Ok(Json(updated_preferences))
}

#[utoipa::path(
	delete,
	path = "/api/v1/users/:id",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's id.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully deleted user.", body = User),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "User not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Deletes a user by ID.
async fn delete_user_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
	Json(input): Json<DeleteUser>,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();
	let user = get_session_admin_user(&session)?;

	if user.id == id {
		return Err(ApiError::BadRequest(
			"You cannot delete your own account.".into(),
		));
	}

	let hard_delete = input.hard_delete.unwrap_or(false);

	let deleted_user = if hard_delete {
		db.user().delete(user::id::equals(id.clone())).exec().await
	} else {
		db.user()
			.update(
				user::id::equals(id.clone()),
				vec![user::deleted_at::set(Some(Utc::now().into()))],
			)
			.exec()
			.await
	}?;

	debug!(?deleted_user, "Deleted user");

	Ok(Json(User::from(deleted_user)))
}

#[utoipa::path(
	get,
	path = "/api/v1/users/:id",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully fetched user.", body = User),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "User not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Gets a user by ID.
async fn get_user_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<User>> {
	get_session_admin_user(&session)?;
	let db = ctx.get_db();
	let user_by_id = db
		.user()
		.find_unique(user::id::equals(id.clone()))
		.exec()
		.await?;
	debug!(id, ?user_by_id, "Result of fetching user by id");

	if user_by_id.is_none() {
		return Err(ApiError::NotFound(format!("User with id {} not found", id)));
	}

	Ok(Json(User::from(user_by_id.unwrap())))
}

// TODO: pagination!
#[utoipa::path(
	get,
	path = "/api/v1/users/:id/login-activity",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully fetched user.", body = Vec<LoginActivity>),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "User not found."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_user_login_activity_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Vec<LoginActivity>>> {
	let user = get_session_user(&session)?;

	let client = ctx.get_db();

	if user.id != id && !user.is_server_owner() {
		return Err(ApiError::Forbidden(String::from(
			"You cannot access this resource",
		)));
	}

	let user_activity = client
		.user_login_activity()
		.find_many(vec![user_login_activity::user_id::equals(id)])
		.order_by(user_login_activity::timestamp::order(Direction::Desc))
		.exec()
		.await?;

	Ok(Json(
		user_activity.into_iter().map(LoginActivity::from).collect(),
	))
}

#[utoipa::path(
	put,
	path = "/api/v1/users/:id",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	request_body = UpdateUser,
	responses(
		(status = 200, description = "Successfully updated user.", body = User),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Updates a user by ID.
async fn update_user_handler(
	mut writable_session: WritableSession,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateUser>,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();
	let user = get_writable_session_user(&writable_session)?;

	// TODO: determine what a server owner can update.
	if user.id != id {
		return Err(ApiError::forbidden_discreet());
	}

	let updated_user = update_user(db, id, input).await?;
	debug!(?updated_user, "Updated user");

	writable_session
		.insert("user", updated_user.clone())
		.map_err(|e| {
			ApiError::InternalServerError(format!("Failed to update session: {}", e))
		})?;

	Ok(Json(updated_user))
}

#[utoipa::path(
	get,
	path = "/api/v1/users/:id/preferences",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	responses(
		(status = 200, description = "Successfully fetched user preferences.", body = UserPreferences),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "User preferences not found."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Gets the user's preferences.
async fn get_user_preferences(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;

	if id != user.id {
		return Err(ApiError::forbidden_discreet());
	}

	let user_preferences = db
		.user_preferences()
		.find_unique(user_preferences::user_id::equals(id.clone()))
		.exec()
		.await?;
	debug!(id, ?user_preferences, "Fetched user preferences");

	if user_preferences.is_none() {
		return Err(ApiError::NotFound(format!(
			"User preferences with id {} not found",
			id
		)));
	}

	Ok(Json(UserPreferences::from(user_preferences.unwrap())))
}

// TODO: this is now a duplicate, do I need it? I think to remain RESTful, yes...
#[utoipa::path(
	put,
	path = "/api/v1/users/:id/preferences",
	tag = "user",
	params(
		("id" = String, Path, description = "The user's ID.", example = "1ab2c3d4")
	),
	request_body = UpdateUserPreferences,
	responses(
		(status = 200, description = "Successfully updated user preferences.", body = UserPreferences),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Updates a user's preferences.
async fn update_user_preferences(
	mut writable_session: WritableSession,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateUserPreferences>,
) -> ApiResult<Json<UserPreferences>> {
	trace!(?id, ?input, "Updating user preferences");
	let db = ctx.get_db();

	let user = get_writable_session_user(&writable_session)?;
	let user_preferences = user.user_preferences.clone().unwrap_or_default();

	if user_preferences.id != input.id {
		return Err(ApiError::forbidden_discreet());
	}

	let updated_preferences = update_preferences(db, user_preferences.id, input).await?;
	debug!(?updated_preferences, "Updated user preferences");

	writable_session
		.insert(
			"user",
			User {
				user_preferences: Some(updated_preferences.clone()),
				..user
			},
		)
		.map_err(|e| {
			ApiError::InternalServerError(format!("Failed to update session: {}", e))
		})?;

	Ok(Json(updated_preferences))
}
