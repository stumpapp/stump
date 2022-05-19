use rocket::serde::json::Json;

use crate::config::context;

use super::{
	errors::{ApiError, ProcessFileError},
	models::{AuthenticatedUser, ProcessedMediaFile},
};

pub type Session<'a> = rocket_session_store::Session<'a, AuthenticatedUser>;
pub type Context = rocket::State<context::Context>;

pub type ApiResult<T> = Result<T, ApiError>;

pub type LoginResult = ApiResult<Json<AuthenticatedUser>>;

pub type ProcessResult = Result<ProcessedMediaFile, ProcessFileError>;
