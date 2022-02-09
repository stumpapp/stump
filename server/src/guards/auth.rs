use rocket::{
    http::Status,
    request::{FromRequest, Outcome, Request},
};

use crate::{
    database::{entities::user::AuthenticatedUser, queries::user::get_user_by_username},
    State,
};

type Session<'a> = rocket_session_store::Session<'a, AuthenticatedUser>;

pub struct OpdsAuth;

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication

#[rocket::async_trait]
impl<'r> FromRequest<'r> for OpdsAuth {
    type Error = ();

    async fn from_request(req: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let session: Session<'_> = req.guard().await.expect("TODO");

        if let Some(user) = session.get().await.expect("TODO") {
            return Outcome::Success(OpdsAuth {});
        }

        let state: &State = req.guard().await.expect("TODO");

        let authorization = req.headers().get_one("authorization");

        println!("{:?}", authorization);

        if authorization.is_none() {
            println!("No authorization header");
            return Outcome::Failure((Status::Unauthorized, ()));
        } else {
            let authorization = authorization.unwrap();
            println!("{:?}", authorization);

            let token: String;

            if authorization.starts_with("Basic ") {
                token = authorization.replace("Basic ", "");
            } else {
                println!("Invalid authorization header");
                return Outcome::Failure((Status::BadRequest, ()));
            }

            println!("{:?}", token);

            let decoded = base64::decode(token);

            if decoded.is_err() {
                return Outcome::Failure((Status::Unauthorized, ()));
            }

            let bytes = decoded.unwrap();
            let decoded = String::from_utf8(bytes).unwrap();

            // Outcome::Success(decoded)
            println!("{:?}", decoded);

            let username = decoded.split(":").next().unwrap();
            let password = decoded.split(":").skip(1).next().unwrap();

            let user = get_user_by_username(username, state.get_connection())
                .await
                .expect("TODO");

            if user.is_none() {
                return Outcome::Failure((Status::Unauthorized, ()));
            }

            let user = user.unwrap();

            let matches = bcrypt::verify(password, &user.password).expect("TODO");

            if matches {
                session.set(user.into()).await.expect("TODO");
                return Outcome::Success(OpdsAuth {});
            } else {
                return Outcome::Failure((Status::Unauthorized, ()));
            }
        }
    }
}
