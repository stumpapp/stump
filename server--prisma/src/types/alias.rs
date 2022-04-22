use rocket::serde::json::Json;

use crate::config::state::AppState;

use super::{errors::ApiError, models::AuthenticatedUser};

pub type Session<'a> = rocket_session_store::Session<'a, AuthenticatedUser>;
pub type State = rocket::State<AppState>;

pub type ApiResult<T> = Result<T, ApiError>;

pub type LoginResult = ApiResult<Json<AuthenticatedUser>>;
