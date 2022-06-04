use rocket::{
	http::Status,
	request::{FromRequest, Outcome, Request},
};

use rocket_okapi::OpenApiFromRequest;

use crate::{
	prisma::{self, user},
	types::{
		alias::{Context, Session},
		errors::AuthError,
		models::AuthenticatedUser,
	},
	utils::{self},
};

#[derive(OpenApiFromRequest)]
pub struct Auth(pub AuthenticatedUser);

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication

// FIXME: This is still really gross, there must be a neater way to handle this with all the safety checks
// than what I am doing here.
#[rocket::async_trait]
impl<'r> FromRequest<'r> for Auth {
	type Error = AuthError;

	async fn from_request(req: &'r Request<'_>) -> Outcome<Self, Self::Error> {
		let session: Session<'_> = req.guard().await.expect("TODO");

		match session.get().await {
			Ok(res) => {
				// println!("{:?}", res);
				if res.is_some() {
					// println!("Session existed: {:?}", res);
					return Outcome::Success(Auth(res.unwrap()));
				}
			},
			Err(e) => {
				return Outcome::Failure((
					Status::Unauthorized,
					AuthError::InvalidSession(e),
				));
			},
		};

		let cookies = req.cookies();
		let cookie = cookies.get("stump-session");

		// if cookie exists and is valid, refresh the session?
		if cookie.is_some() {
			let cookie = cookie.unwrap();
			let _cookie_value = cookie.value();

			// println!("COOKIE VALUE: {:?}", cookie_value);

			// unimplemented!()

			// let user = get_user_by_username(cookie_value, &req.guard().await.expect("TODO")).await;

			// if user.is_some() {
			//     session.set(user.unwrap().into()).await.expect("TODO");
			//     return Outcome::Success(Auth(user.unwrap()));
			// }
		}

		let ctx: &Context = req.guard().await.expect("TODO");

		let authorization = req.headers().get_one("authorization");

		if authorization.is_none() {
			Outcome::Failure((Status::Unauthorized, AuthError::BadRequest))
		} else {
			let authorization = authorization.unwrap_or("");
			let token: String;

			// println!("Authorization: {}", authorization);

			if authorization.starts_with("Basic ") {
				token = authorization.replace("Basic ", "");
			} else {
				return Outcome::Failure((Status::BadRequest, AuthError::BadRequest));
			}

			let decoded = base64::decode(token);

			if decoded.is_err() {
				return Outcome::Failure((Status::Unauthorized, AuthError::BadRequest));
			}

			let bytes = decoded.unwrap();

			let credentials = utils::auth::decode_base64_credentials(bytes);

			if credentials.is_err() {
				return Outcome::Failure((
					Status::Unauthorized,
					credentials.err().unwrap(),
				));
			}

			let credentials = credentials.unwrap();

			let db = ctx.get_db();

			let user = db
				.user()
				.find_unique(prisma::user::UniqueWhereParam::UsernameEquals(
					credentials.username,
				))
				.with(user::user_preferences::fetch())
				.exec()
				.await;

			if user.is_err() {
				// println!("User error: {:?}", user.err().unwrap());
				return Outcome::Failure((Status::Unauthorized, AuthError::Unauthorized));
			}
			let user = user.unwrap();

			// println!("User: {:?}", user);

			if user.is_none() {
				return Outcome::Failure((Status::Unauthorized, AuthError::Unauthorized));
			}

			let user = user.unwrap();

			let matches = utils::auth::verify_password(
				&user.hashed_password,
				&credentials.password,
			);

			if matches.is_err() {
				Outcome::Failure((Status::Unauthorized, matches.err().unwrap()))
			} else if matches.unwrap() {
				let authed_user: AuthenticatedUser = user.into();
				session
					.set(authed_user.clone())
					.await
					.expect("An error occurred while setting the session");
				Outcome::Success(Auth(authed_user))
			} else {
				Outcome::Failure((Status::Unauthorized, AuthError::Unauthorized))
			}
		}
	}
}

#[derive(OpenApiFromRequest)]
pub struct AdminGuard(pub AuthenticatedUser);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AdminGuard {
	type Error = AuthError;

	async fn from_request(req: &'r Request<'_>) -> Outcome<Self, Self::Error> {
		let session: Session<'_> = req.guard().await.expect("TODO");

		let user = match session.get().await {
			Ok(res) => res,
			Err(e) => {
				return Outcome::Failure((
					Status::InternalServerError,
					AuthError::InvalidSession(e),
				));
			},
		};

		if let Some(user) = user {
			if user.role == "SERVER_OWNER" {
				return Outcome::Success(AdminGuard(user));
			} else {
				return Outcome::Failure((Status::Forbidden, AuthError::Forbidden));
			}
		}

		let cookies = req.cookies();
		let cookie = cookies.get("stump-session");

		// if cookie exists and is valid, refresh the session?
		if cookie.is_some() {
			let cookie = cookie.unwrap();
			let cookie_value = cookie.value();

			println!("COOKIE VALUE: {:?}", cookie_value);

			unimplemented!("TODO: implement refresh session from cookies (maybe)")
		}

		Outcome::Failure((Status::Unauthorized, AuthError::Unauthorized))
	}
}
