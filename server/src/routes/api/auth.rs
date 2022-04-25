use rocket::serde::json::Json;

use crate::{
    guards::auth::StumpAuth,
    prisma::user,
    types::{
        alias::{ApiResult, Context, LoginResult, Session},
        enums::UserRole,
        errors::ApiError,
        models::{AuthenticatedUser, LoginRequest},
    },
    utils::auth,
};

#[get("/auth/me")]
pub async fn me(session: Session<'_>, _auth: StumpAuth) -> Option<Json<AuthenticatedUser>> {
    match session.get().await.expect("Session error") {
        Some(user) => Some(Json(user)),
        _ => None,
    }
}

#[post("/auth/login", data = "<credentials>")]
pub async fn login(
    ctx: &Context,
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
        .exec()
        .await?;

    match user {
        Some(user) => {
            let matches = bcrypt::verify(credentials.password.to_owned(), &user.hashed_password)?;

            if matches {
                session.set(user.clone().into()).await?;
                Ok(Json(user.into()))
            } else {
                Err(ApiError::Unauthorized("Invalid credentials".to_string()))
            }
        }
        None => Err(ApiError::Forbidden("Invalid credentials".to_string())),
    }
}

// TODO: this entire flow needs a rework. I am not sure if people with *access* to the server
// should be able to register without the ServerOwner user approving. Maybe this can be something
// configurable? Maybe just allow it? Maybe make it an approval versus just registering immediately?
#[post("/auth/register", data = "<credentials>")]
pub async fn register(
    ctx: &Context,
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

    let user = db
        .user()
        .create(
            user::username::set(credentials.username.to_owned()),
            user::hashed_password::set(hashed_password),
            vec![user::role::set(user_role.into())],
        )
        .exec()
        .await?;

    Ok(Json(user.into()))
}

#[post("/auth/logout")]
pub async fn logout(session: Session<'_>) -> ApiResult<()> {
    Ok(session.remove().await?)
}
