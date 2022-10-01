use std::sync::Arc;

use async_session::serde::Deserialize;
use axum::{
	http::StatusCode,
	response::IntoResponse,
	routing::{get, post},
	Extension, Json, Router,
};
use axum_extra::extract::CookieJar;
use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{config::Ctx, prisma::user, types::User};

use crate::config::state::State;

pub(crate) fn mount() -> Router {
	Router::new().nest(
		"/auth",
		Router::new()
			.route("/me", get(viewer))
			.route("/login", post(login)),
	)
}

async fn viewer(session: ReadableSession) {
	println!("viewer");

	let session_user = session.get::<User>("user");

	if session_user.is_none() {
		println!("no user");
	} else if let Some(user) = session_user {
		println!("user: {:?}", user);
	}
}

#[derive(Deserialize)]
pub struct LoginOrRegisterArgs {
	pub username: String,
	pub password: String,
}

// Wow, this is really ugly syntax for state extraction imo...
async fn login(
	Json(input): Json<LoginOrRegisterArgs>,
	Extension(ctx): Extension<Arc<Ctx>>,
	mut session: WritableSession,
) -> impl IntoResponse {
	let db = ctx.get_db();

	if let Some(user) = session.get::<User>("user") {
		if input.username == user.username {
			println!("already logged in: {:?}", user);
			return (StatusCode::OK, Json(Some(user)));
		}
	}

	if let Some(db_user) = db
		.user()
		.find_unique(user::username::equals(input.username.to_owned()))
		.with(user::user_preferences::fetch())
		.exec()
		.await
		.unwrap()
	{
		println!("found db user: {:?}", db_user);

		// TODO: check password

		let user: User = db_user.into();
		session.insert("user", user.clone()).unwrap();

		return (StatusCode::OK, Json(Some(user)));
	} else {
		println!("no user found: {:?}", input.username);

		println!("{:?}", db.user().find_first(vec![]).exec().await.unwrap());
		// return Err(ServerError::UserNotFound);
		return (StatusCode::UNAUTHORIZED, Json(None));
	}
}

async fn register(jar: CookieJar) {}

async fn logout(jar: CookieJar) {}
