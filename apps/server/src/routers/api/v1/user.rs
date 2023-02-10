use axum::{
	extract::{Path, State},
	middleware::from_extractor_with_state,
	routing::get,
	Json, Router,
};
use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{
	db::models::{User, UserPreferences},
	prelude::{LoginOrRegisterArgs, UpdateUserArgs, UserPreferencesUpdate},
	prisma::{user, user_preferences},
};
use tracing::debug;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{get_hash_cost, get_session_user, get_writable_session_user},
};

// TODO: move some of these user operations to the UserDao...

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		// TODO: adminguard these first two routes
		.route("/users", get(get_users).post(create_user))
		.nest(
			"/users/:id",
			Router::new()
				.route(
					"/",
					get(get_user_by_id)
						.put(update_user)
						.delete(delete_user_by_id),
				)
				.route(
					"/preferences",
					get(get_user_preferences).put(update_user_preferences),
				),
		)
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

async fn get_users(
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<Vec<User>>> {
	let user = get_session_user(&session)?;

	// FIXME: admin middleware
	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	}

	Ok(Json(
		ctx.db
			.user()
			.find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(|u| u.into())
			.collect::<Vec<User>>(),
	))
}

async fn create_user(
	session: ReadableSession,
	State(ctx): State<AppState>,
	Json(input): Json<LoginOrRegisterArgs>,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;

	// TODO: admin middleware instead
	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	}
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
		.create(vec![user_preferences::user::connect(user::id::equals(
			created_user.id.clone(),
		))])
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

async fn delete_user_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<String>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;

	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	} else if user.id == id {
		return Err(ApiError::BadRequest(
			"You cannot delete your own account.".into(),
		));
	}

	let deleted_user = db
		.user()
		.delete(user::id::equals(id.clone()))
		.exec()
		.await?;

	debug!(?deleted_user, "Deleted user");

	Ok(Json(deleted_user.id))
}

async fn get_user_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;

	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	}

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

async fn update_user(
	mut writable_session: WritableSession,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UpdateUserArgs>,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();
	let user = get_writable_session_user(&writable_session)?;

	if user.id != id {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	}

	let mut update_params = vec![user::username::set(input.username)];
	if let Some(password) = input.password {
		let hashed_password = bcrypt::hash(password, get_hash_cost())?;
		update_params.push(user::hashed_password::set(hashed_password));
	}

	let updated_user_data = db
		.user()
		.update(user::id::equals(user.id.clone()), update_params)
		.exec()
		.await?;
	let updated_user = User::from(updated_user_data);
	debug!(?updated_user, "Updated user");

	writable_session
		.insert("user", updated_user.clone())
		.map_err(|e| {
			ApiError::InternalServerError(format!("Failed to update session: {}", e))
		})?;

	Ok(Json(updated_user))
}

async fn get_user_preferences(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;

	if id != user.id {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	}

	let user_preferences = db
		.user_preferences()
		.find_unique(user_preferences::id::equals(id.clone()))
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

#[allow(unused)]
async fn update_user_preferences(
	mut writable_session: WritableSession,
	State(ctx): State<AppState>,
	Path(id): Path<String>,
	Json(input): Json<UserPreferencesUpdate>,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();

	let user = get_writable_session_user(&writable_session)?;
	let user_preferences = user.user_preferences.clone().unwrap_or_default();

	if user_preferences.id != input.id {
		return Err(ApiError::Forbidden(
			"You cannot update another user's preferences".into(),
		));
	}

	let updated_preferences = db
		.user_preferences()
		.update(
			user_preferences::id::equals(user_preferences.id.clone()),
			vec![
				user_preferences::locale::set(input.locale.to_owned()),
				user_preferences::library_layout_mode::set(
					input.library_layout_mode.to_owned(),
				),
				user_preferences::series_layout_mode::set(
					input.series_layout_mode.to_owned(),
				),
			],
		)
		.exec()
		.await?;
	debug!(?updated_preferences, "Updated user preferences");

	writable_session
		.insert(
			"user",
			User {
				user_preferences: Some(UserPreferences::from(
					updated_preferences.clone(),
				)),
				..user
			},
		)
		.map_err(|e| {
			ApiError::InternalServerError(format!("Failed to update session: {}", e))
		})?;

	Ok(Json(UserPreferences::from(updated_preferences)))
}
