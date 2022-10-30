use axum::{
	routing::{get, post},
	Extension, Json, Router,
};
use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{
	db::models::User,
	prelude::{LoginOrRegisterArgs, UserRole},
	prisma::{user, user_preferences},
};

use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	utils::{self, verify_password},
};

pub(crate) fn mount() -> Router {
	Router::new().nest(
		"/auth",
		Router::new()
			.route("/me", get(viewer))
			.route("/login", post(login))
			.route("/logout", post(logout))
			.route("/register", post(register)),
	)
}

async fn viewer(session: ReadableSession) -> ApiResult<Json<User>> {
	if let Some(user) = session.get::<User>("user") {
		Ok(Json(user))
	} else {
		Err(ApiError::Unauthorized)
	}
}

// Wow, this is really ugly syntax for state extraction imo...
async fn login(
	Json(input): Json<LoginOrRegisterArgs>,
	Extension(ctx): State,
	mut session: WritableSession,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();

	if let Some(user) = session.get::<User>("user") {
		if input.username == user.username {
			return Ok(Json(user));
		}
	}

	let fetched_user = db
		.user()
		.find_unique(user::username::equals(input.username.to_owned()))
		.with(user::user_preferences::fetch())
		.exec()
		.await?;

	if let Some(db_user) = fetched_user {
		let matches = verify_password(&db_user.hashed_password, &input.password)?;
		if !matches {
			return Err(ApiError::Unauthorized);
		}

		let user: User = db_user.into();
		session.insert("user", user.clone()).unwrap();

		return Ok(Json(user));
	}

	Err(ApiError::Unauthorized)
}

async fn logout(mut session: WritableSession) -> ApiResult<()> {
	session.destroy();
	Ok(())
}

pub async fn register(
	Json(input): Json<LoginOrRegisterArgs>,
	Extension(ctx): State,
	session: ReadableSession,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();

	let has_users = db.user().find_first(vec![]).exec().await?.is_some();

	let mut user_role = UserRole::default();

	// server owners must register member accounts
	if session.get::<User>("user").is_none() && has_users {
		return Err(ApiError::Forbidden(
			"Must be server owner to register member accounts".to_string(),
		));
	} else if !has_users {
		// register the user as owner
		user_role = UserRole::ServerOwner;
	}

	let hashed_password = bcrypt::hash(&input.password, utils::get_hash_cost())?;

	let created_user = db
		.user()
		.create(
			input.username.to_owned(),
			hashed_password,
			vec![user::role::set(user_role.into())],
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
