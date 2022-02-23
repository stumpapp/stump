use entity::sea_orm;
use entity::user::{self, UserRole};
use rocket::serde::{json::Json, Deserialize};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};

use crate::guards::auth::StumpAuth;
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

#[post("/auth/login", data = "<credentials>")]
pub async fn login(state: &State, session: Session<'_>, credentials: Json<LoginRequest<'_>>) {
    let existing_session = session.get().await.expect("TODO");

    if existing_session.is_some() {
        println!("User already logged in: {:?}", existing_session.unwrap());
        return;
    }

    let user: Option<user::Model> = user::Entity::find()
        .filter(user::Column::Username.eq(credentials.username))
        .one(state.get_connection())
        .await
        .expect("TODO");

    match user {
        Some(user) => {
            let matches = bcrypt::verify(credentials.password, &user.password).expect("TODO");

            if matches {
                session.set(user.into()).await.expect("TODO");
                println!("{:?}", session.get().await.expect("TODO"));
            } else {
                unimplemented!()
            }
        }
        None => unimplemented!(),
    }
}

#[post("/auth/register", data = "<credentials>")]
pub async fn register(
    state: &State,
    session: Session<'_>,
    credentials: Json<LoginRequest<'_>>,
) -> Result<String, String> {
    let existing_session = session.get().await.expect("TODO");

    let has_users = user::Entity::find()
        .one(state.get_connection())
        .await
        .expect("TODO")
        .is_some();

    let mut user_role = UserRole::default();

    // owners must register member accounts
    if existing_session.is_none() && has_users {
        unimplemented!()
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

    Ok(user_model.id.to_string())
}
