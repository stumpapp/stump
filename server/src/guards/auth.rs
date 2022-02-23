use rocket::{
    http::Status,
    request::{FromRequest, Outcome, Request},
};

use crate::{database::queries::user::get_user_by_username, utils, State};
use crate::{types::dto::user::AuthenticatedUser, utils::auth::AuthError};

type Session<'a> = rocket_session_store::Session<'a, AuthenticatedUser>;

pub struct StumpAuth(pub AuthenticatedUser);

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication

// FIXME: This is still really gross, there must be a neater way to handle this with all the safety checks
// than what I am doing here.
#[rocket::async_trait]
impl<'r> FromRequest<'r> for StumpAuth {
    type Error = AuthError;

    async fn from_request(req: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let session: Session<'_> = req.guard().await.expect("TODO");

        match session.get().await {
            Ok(res) => {
                println!("{:?}", res);
                if res.is_some() {
                    println!("Session existed: {:?}", res);
                    return Outcome::Success(StumpAuth(res.unwrap()));
                }
            }
            Err(e) => {
                return Outcome::Failure((Status::Unauthorized, AuthError::InvalidSession(e)));
            }
        };

        let cookies = req.cookies();
        println!("{:?}", cookies);
        let cookie = cookies.get("stump-session");

        // if cookie exists and is valid, refresh the session
        if cookie.is_some() {
            let cookie = cookie.unwrap();
            let cookie_value = cookie.value();

            println!("COOKIE VALUE: {:?}", cookie_value);

            println!("TOUCH: {:?}", session.touch().await);

            println!("GET: {:?}", session.get().await);

            // let user = get_user_by_username(cookie_value, &req.guard().await.expect("TODO")).await;

            // if user.is_some() {
            //     session.set(user.unwrap().into()).await.expect("TODO");
            //     return Outcome::Success(StumpAuth(user.unwrap()));
            // }
        }

        let state: &State = req.guard().await.expect("TODO");

        let authorization = req.headers().get_one("authorization");

        if authorization.is_none() {
            Outcome::Failure((Status::Unauthorized, AuthError::BadRequest))
        } else {
            let authorization = authorization.unwrap_or("");
            let token: String;

            println!("Authorization: {}", authorization);

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
                return Outcome::Failure((Status::Unauthorized, credentials.err().unwrap()));
            }

            let credentials = credentials.unwrap();

            println!("Credentials: {:?}", credentials);

            let user = get_user_by_username(&credentials.username, state.get_connection()).await;

            if user.is_err() {
                println!("User error: {:?}", user.err().unwrap());
                return Outcome::Failure((Status::Unauthorized, AuthError::Unauthorized));
            }
            let user = user.unwrap();

            println!("User: {:?}", user);

            if user.is_none() {
                return Outcome::Failure((Status::Unauthorized, AuthError::Unauthorized));
            }

            let user = user.unwrap();

            let matches = utils::auth::verify_password(&user.password, &credentials.password);

            if matches.is_err() {
                Outcome::Failure((Status::Unauthorized, matches.err().unwrap()))
            } else if matches.unwrap() {
                let authed_user: AuthenticatedUser = user.into();
                session
                    .set(authed_user.clone())
                    .await
                    .expect("An error occurred while setting the session");
                Outcome::Success(StumpAuth(authed_user))
            } else {
                Outcome::Failure((Status::Unauthorized, AuthError::Unauthorized))
            }
        }
    }
}
