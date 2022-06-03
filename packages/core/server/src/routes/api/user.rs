use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	guards::auth::AdminGuard,
	prisma::{user, user_preferences},
	types::{
		alias::{ApiResult, Context},
		models::{user::User, LoginRequest},
	},
	utils::auth,
};

#[openapi(tag = "User")]
#[get("/users")]
pub async fn get_users(ctx: &Context, _auth: AdminGuard) -> ApiResult<Json<Vec<User>>> {
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

#[openapi(tag = "User")]
#[post("/users", data = "<credentials>")]
pub async fn create_user(
	ctx: &Context,
	_auth: AdminGuard,
	credentials: Json<LoginRequest>,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();

	let hashed_password = bcrypt::hash(&credentials.password, auth::get_hash_cost())?;

	let created_user = db
		.user()
		.create(
			user::username::set(credentials.username.to_owned()),
			user::hashed_password::set(hashed_password),
			vec![],
		)
		.exec()
		.await?;

	// FIXME: these next two queries will be removed once nested create statements are
	// supported on the prisma client. Until then, this ugly mess is necessary.
	// https://github.com/Brendonovich/prisma-client-rust/issues/44
	let _user_preferences = db
		.user_preferences()
		.create(vec![user_preferences::user::link(vec![user::id::equals(
			created_user.id.clone(),
		)])])
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

#[openapi(tag = "User")]
#[put("/users")]
pub async fn update_user() {
	unimplemented!()
}
