use axum::{
	extract::Path, middleware::from_extractor, routing::get, Extension, Json, Router,
};
use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{
	db::models::{User, UserPreferences},
	prelude::{LoginOrRegisterArgs, UpdateUserArgs, UserPreferencesUpdate},
	prisma::{user, user_preferences},
};

use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::{get_hash_cost, get_session_user, get_writable_session_user},
};

// TODO: move some of these user operations to the UserDao...

pub(crate) fn mount() -> Router {
	Router::new()
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
		.layer(from_extractor::<Auth>())
}

async fn get_users(
	Extension(ctx): State,
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
	Extension(ctx): State,
	Json(input): Json<LoginOrRegisterArgs>,
	session: ReadableSession,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;

	// FIXME: admin middleware
	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	}
	let hashed_password = bcrypt::hash(&input.password, get_hash_cost())?;

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
	Extension(ctx): State,
	session: ReadableSession,
) -> ApiResult<Json<String>> {
	let db = ctx.get_db();
	let user = get_session_user(&session)?;

	// TODO: Add user delete himself and admin cannot delete hiimselt
	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
	}

	let deleted_user = db
		.user()
		.delete(user::id::equals(id.clone()))
		.exec()
		.await?;

	Ok(Json(deleted_user.id))
}

async fn get_user_by_id(
	Path(id): Path<String>,
	Extension(ctx): State,
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

	if user_by_id.is_none() {
		return Err(ApiError::NotFound(format!("User with id {} not found", id)));
	}

	Ok(Json(User::from(user_by_id.unwrap())))
}

async fn update_user(
	Path(id): Path<String>,
	Json(input): Json<UpdateUserArgs>,
	Extension(ctx): State,
	mut writable_session: WritableSession,
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
		let hashed_password = bcrypt::hash(&password, get_hash_cost())?;
		update_params.push(user::hashed_password::set(hashed_password));
	}

	let updated_user = User::from(
		db.user()
			.update(user::id::equals(user.id.clone()), update_params)
			.exec()
			.await?,
	);

	writable_session
		.insert("user", updated_user.clone())
		.map_err(|e| {
			ApiError::InternalServerError(format!("Failed to update session: {}", e))
		})?;

	Ok(Json(updated_user))
}

// FIXME: remove this once I resolve the below 'TODO'
async fn get_user_preferences(
	Path(id): Path<String>,
	Extension(ctx): State,
	// session: ReadableSession,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();

	Ok(Json(
		db.user_preferences()
			.find_unique(user_preferences::id::equals(id.clone()))
			.exec()
			.await?
			.expect("Failed to fetch user preferences")
			.into(), // .map(|p| p.into()),
		          // user_preferences,
	))
}

// TODO: I load the user preferences from the session in the auth call.
// If a session didn't exist then I load it from DB. I think for now this is OK since
// all the preferences are client-side, so if the server is not in sync with
// preferences updates it is not a big deal. This will have to change somehow in the
// future potentially though, unless I just load preferences when required.
//
// Note: I don't even use the user id to load the preferences, as I pull it from
// when I got from the session. I could remove the ID requirement. I think the preferences
// structure needs to eventually change a little anyways, I don't like how I can't query
// by user id, it should be a unique where param but it isn't with how I structured it...
// FIXME: remove this 'allow' once I resolve the above 'TODO'
#[allow(unused)]
async fn update_user_preferences(
	Path(id): Path<String>,
	Json(input): Json<UserPreferencesUpdate>,
	Extension(ctx): State,
	session: ReadableSession,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();

	let user = get_session_user(&session)?;
	let user_preferences = user.user_preferences.unwrap_or_default();

	if user_preferences.id != input.id {
		return Err(ApiError::Forbidden(
			"You cannot update another user's preferences".into(),
		));
	}

	Ok(Json(
		db.user_preferences()
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
			.await?
			.into(),
	))
}
