use entity::sea_orm;
use entity::user::{self, UserRole};
use rocket::serde::{json::Json, Deserialize};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};

use crate::guards::auth::StumpAuth;
use crate::routing::error::{ApiError, ApiResult};
use crate::types::dto::user::AuthenticatedUser;
use crate::State;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct LoginRequest<'r> {
    username: &'r str,
    password: &'r str,
}

type Session<'a> = rocket_session_store::Session<'a, AuthenticatedUser>;

// FIXME: messy and bad error handling literally everywhere in this file

#[get("/auth/me")]
pub async fn me(session: Session<'_>, auth: StumpAuth) -> Option<Json<AuthenticatedUser>> {
    match session.get().await.expect("Could not get session") {
        Some(user) => Some(Json(user)),
        _ => None,
    }
}

type LoginResult = ApiResult<Json<AuthenticatedUser>>;

#[post("/auth/login", data = "<credentials>")]
pub async fn login(
    state: &State,
    session: Session<'_>,
    credentials: Json<LoginRequest<'_>>,
) -> LoginResult {
    let existing_session = session.get().await.expect("TODO");

    if let Some(user) = existing_session {
        return Ok(Json(user.into()));
    }

    let user: Option<user::Model> = user::Entity::find()
        .filter(user::Column::Username.eq(credentials.username))
        .one(state.get_connection())
        .await
        .expect("TODO");

    match user {
        Some(user) => {
            let matches = bcrypt::verify(credentials.password, &user.password)
                .expect("Error setting session");

            if matches {
                session
                    .set(user.clone().into())
                    .await
                    .expect("Error setting session");
                Ok(Json(user.into()))
            } else {
                Err(ApiError::Unauthorized("Invalid credentials".to_string()))
            }
        }
        None => Err(ApiError::Forbidden("Invalid credentials".to_string())),
    }
}

#[post("/auth/register", data = "<credentials>")]
pub async fn register(
    state: &State,
    session: Session<'_>,
    credentials: Json<LoginRequest<'_>>,
) -> ApiResult<Json<AuthenticatedUser>> {
    let existing_session = session.get().await.expect("TODO");

    let has_users = user::Entity::find()
        .one(state.get_connection())
        .await
        .expect("TODO")
        .is_some();

    let mut user_role = UserRole::default();

    // owners must register member accounts
    if existing_session.is_none() && has_users {
        return Err(ApiError::Forbidden(
            "Must be owner to register member accounts".to_string(),
        ));
    } else if !has_users {
        // register the user as owner
        user_role = UserRole::Owner;
    }

    // TODO: env var cost
    let hashed_password = bcrypt::hash(credentials.password, 12).expect("TODO");

    let new_user = user::ActiveModel {
        username: Set(credentials.username.into()),
        password: Set(hashed_password),
        role: Set(user_role),
        ..Default::default()
    };

    let user_model = new_user.insert(state.get_connection()).await.expect("TODO");

    Ok(Json(user_model.into()))
}
