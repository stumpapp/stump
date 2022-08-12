use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	guards::auth::Auth,
	prisma::{user, user_preferences},
	types::{
		alias::{ApiResult, Ctx, LoginResult, Session},
		enums::UserRole,
		errors::ApiError,
		models::{AuthenticatedUser, LoginRequest},
	},
	utils::auth,
};

/// Attempts to grab the user from the session.
#[openapi(tag = "Auth")]
#[get("/auth/me")]
pub async fn me(
	ctx: &Ctx,
	_session: Session<'_>,
	auth: Auth,
) -> ApiResult<Json<Option<AuthenticatedUser>>> {
	let db = ctx.get_db();

	// FIXME: I am querying here because I need the most up to date preferences... I need to
	// decide if I should update the session each time the preferences/user gets updated!
	Ok(Json(
		db.user()
			.find_unique(user::id::equals(auth.0.id))
			.with(user::user_preferences::fetch())
			.exec()
			.await?
			.map(|u| u.into()),
	))

	// match session.get().await.expect("Session error") {
	// 	Some(user) => Some(Json(user)),
	// 	_ => None,
	// }
}

/// Attempt to login a user. On success, a session is created and the user is returned.
#[openapi(tag = "Auth")]
#[post("/auth/login", data = "<credentials>")]
pub async fn login(
	ctx: &Ctx,
	session: Session<'_>,
	credentials: Json<LoginRequest>,
) -> LoginResult {
	let existing_session = session.get().await?;

	if let Some(user) = existing_session {
		return Ok(Json(user.into()));
	}

	let db = ctx.get_db();

	let user = db
		.user()
		.find_unique(user::username::equals(credentials.username.to_owned()))
		.with(user::user_preferences::fetch())
		.exec()
		.await?;

	match user {
		Some(user) => {
			let matches =
				bcrypt::verify(credentials.password.to_owned(), &user.hashed_password)?;

			if matches {
				session.set(user.clone().into()).await?;
				Ok(Json(user.into()))
			} else {
				Err(ApiError::Unauthorized("Invalid credentials".to_string()))
			}
		},
		None => Err(ApiError::Forbidden("Invalid credentials".to_string())),
	}
}

/// Attempts to register a new user. On success, a session is *not* created, but the user is returned. Only the
/// server owner can register new users, however if the server has no users it is considered to be 'unclaimed'
/// and will assign the tentative new user the SERVER_OWNER role.
#[openapi(tag = "Auth")]
#[post("/auth/register", data = "<credentials>")]
pub async fn register(
	ctx: &Ctx,
	session: Session<'_>,
	credentials: Json<LoginRequest>,
) -> ApiResult<Json<AuthenticatedUser>> {
	let existing_session = session.get().await?;
	let db = ctx.get_db();

	let has_users = db.user().find_first(vec![]).exec().await?.is_some();

	let mut user_role = UserRole::default();

	// server owners must register member accounts
	if existing_session.is_none() && has_users {
		return Err(ApiError::Forbidden(
			"Must be server owner to register member accounts".to_string(),
		));
	} else if !has_users {
		// register the user as owner
		user_role = UserRole::ServerOwner;
	}

	let hashed_password = bcrypt::hash(&credentials.password, auth::get_hash_cost())?;

	let created_user = db
		.user()
		.create(
			user::username::set(credentials.username.to_owned()),
			user::hashed_password::set(hashed_password),
			vec![user::role::set(user_role.into())],
		)
		.exec()
		.await?;

	// FIXME: these next two queries will be removed once nested create statements are
	// supported on the prisma client. Until then, this ugly mess is necessary.
	let _user_preferences = db
		.user_preferences()
		.create(vec![user_preferences::user::link(user::id::equals(
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

/// Attempts to logout the current user, destroying the session.
#[openapi(tag = "Auth")]
#[post("/auth/logout")]
pub async fn logout(session: Session<'_>) -> ApiResult<()> {
	Ok(session.remove().await?)
}
