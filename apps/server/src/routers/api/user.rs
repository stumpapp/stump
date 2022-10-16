use axum::{
	extract::Path, middleware::from_extractor, routing::get, Extension, Json, Router,
};
use axum_sessions::extractors::ReadableSession;
use stump_core::{
	prisma::{user, user_preferences},
	types::{LoginOrRegisterArgs, User, UserPreferences, UserPreferencesUpdate},
};

use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	middleware::auth::{AdminGuard, Auth},
	utils::{get_hash_cost, get_session_user},
};

pub(crate) fn mount() -> Router {
	Router::new()
		.route("/users", get(get_users).post(create_user))
		.layer(from_extractor::<AdminGuard>())
		.nest(
			"/users/:id",
			Router::new()
				.route("/", get(get_user_by_id).put(update_user))
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

async fn get_user_by_id() -> ApiResult<()> {
	Err(ApiError::NotImplemented)
}

// TODO: figure out what operations are allowed here, and by whom. E.g. can a server
// owner update user details of another managed account after they've been created?
// or update another user's preferences? I don't like that last one, unsure about
// the first. In general, after creation, I think a user has sole control over their account.
// The server owner should be able to remove them, but I don't think they should be able
// to do anything else?
async fn update_user() -> ApiResult<()> {
	Err(ApiError::NotImplemented)
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
