use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	guards::auth::{AdminGuard, Auth},
	prisma::{user, user_preferences},
	types::{
		alias::{ApiResult, Ctx},
		models::user::{
			LoginOrRegisterArgs, User, UserPreferences, UserPreferencesUpdate,
		},
	},
	utils::auth,
};

#[openapi(tag = "User")]
#[get("/users")]
pub async fn get_users(ctx: &Ctx, _auth: AdminGuard) -> ApiResult<Json<Vec<User>>> {
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
	ctx: &Ctx,
	_auth: AdminGuard,
	credentials: Json<LoginOrRegisterArgs>,
) -> ApiResult<Json<User>> {
	let db = ctx.get_db();

	let hashed_password = bcrypt::hash(&credentials.password, auth::get_hash_cost())?;

	let created_user = db
		.user()
		.create(credentials.username.to_owned(), hashed_password, vec![])
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

// TODO: figure out what operations are allowed here, and by whom. E.g. can a server
// owner update user details of another managed account after they've been created?
// or update another user's preferences? I don't like that last one, unsure about
// the first. In general, after creation, I think a user has sole control over their account.
// The server owner should be able to remove them, but I don't think they should be able
// to do anything else?
#[openapi(tag = "User")]
#[put("/users")]
pub async fn update_user() {
	unimplemented!()
}

// FIXME: remove this once I resolve the below 'TODO'
#[allow(unused_variables)]
#[openapi(tag = "User")]
#[get("/users/<id>/preferences")]
pub async fn get_user_preferences(
	id: String,
	ctx: &Ctx,
	_auth: Auth,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();
	// let user_preferences = auth.0.preferences;

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
#[allow(unused_variables)]
#[openapi(tag = "User")]
#[put("/users/<id>/preferences", data = "<input>")]
pub async fn update_user_preferences(
	id: String,
	input: Json<UserPreferencesUpdate>,
	ctx: &Ctx,
	auth: Auth,
) -> ApiResult<Json<UserPreferences>> {
	let db = ctx.get_db();

	let user_preferences = auth.0.user_preferences;

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
