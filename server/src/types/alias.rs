use rocket::serde::json::Json;

use crate::config::context::Context as AppContext;

use super::{errors::ApiError, models::AuthenticatedUser};

pub type Session<'a> = rocket_session_store::Session<'a, AuthenticatedUser>;
pub type Context = rocket::State<AppContext>;

pub type ApiResult<T> = Result<T, ApiError>;

pub type LoginResult = ApiResult<Json<AuthenticatedUser>>;
