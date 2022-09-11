use rocket::serde::json::Json;

use crate::config::context;

use super::{
	errors::{ApiError, ProcessFileError},
	models::AuthenticatedUser,
};

pub type Session<'a> = rocket_session_store::Session<'a, AuthenticatedUser>;
pub type Ctx = rocket::State<context::Ctx>;

pub type ApiResult<T> = Result<T, ApiError>;

pub type LoginResult = ApiResult<Json<AuthenticatedUser>>;

pub type ProcessFileResult<T> = Result<T, ProcessFileError>;
