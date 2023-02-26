use axum::{
	http::StatusCode,
	response::{IntoResponse, Response},
};
use prisma_client_rust::{
	prisma_errors::query_engine::{RecordNotFound, UniqueKeyViolation},
	QueryError,
};
use stump_core::{
	event::InternalCoreTask,
	prelude::{CoreError, ProcessFileError},
};
use tokio::sync::mpsc;
use utoipa::ToSchema;

use std::net;
use thiserror::Error;

pub type ServerResult<T> = Result<T, ServerError>;
pub type ApiResult<T> = Result<T, ApiError>;

#[derive(Debug, Error)]
pub enum ServerError {
	// TODO: meh
	#[error("{0}")]
	ServerStartError(String),
	#[error("Stump failed to parse the provided address: {0}")]
	InvalidAddress(#[from] net::AddrParseError),
	#[error("{0}")]
	ApiError(#[from] ApiError),
}

#[derive(Error, Debug)]
pub enum AuthError {
	#[error("Error during the authentication process")]
	BcryptError(#[from] bcrypt::BcryptError),
	#[error("Missing or malformed credentials")]
	BadCredentials,
	#[error("The Authorization header could no be parsed")]
	BadRequest,
	#[error("Unauthorized")]
	Unauthorized,
	#[error("Forbidden")]
	Forbidden,
}

impl From<AuthError> for StatusCode {
	fn from(error: AuthError) -> Self {
		match error {
			AuthError::BcryptError(_) => StatusCode::INTERNAL_SERVER_ERROR,
			AuthError::BadCredentials => StatusCode::UNAUTHORIZED,
			AuthError::BadRequest => StatusCode::BAD_REQUEST,
			AuthError::Unauthorized => StatusCode::UNAUTHORIZED,
			AuthError::Forbidden => StatusCode::FORBIDDEN,
		}
	}
}

impl IntoResponse for AuthError {
	fn into_response(self) -> Response {
		match self {
			AuthError::BcryptError(_) => {
				(StatusCode::INTERNAL_SERVER_ERROR, self.to_string())
			},
			AuthError::BadCredentials => (StatusCode::UNAUTHORIZED, self.to_string()),
			AuthError::BadRequest => (StatusCode::BAD_REQUEST, self.to_string()),
			AuthError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
			AuthError::Forbidden => (StatusCode::FORBIDDEN, self.to_string()),
		}
		.into_response()
	}
}

#[allow(unused)]
#[derive(Debug, Error, ToSchema)]
pub enum ApiError {
	#[error("{0}")]
	BadRequest(String),
	#[error("{0}")]
	NotFound(String),
	#[error("{0}")]
	InternalServerError(String),
	#[error("Unauthorized")]
	Unauthorized,
	#[error("{0}")]
	Forbidden(String),
	#[error("This functionality has not been implemented yet")]
	NotImplemented,
	#[error("{0}")]
	ServiceUnavailable(String),
	#[error("{0}")]
	BadGateway(String),
	#[error("{0}")]
	Unknown(String),
	#[error("{0}")]
	Redirect(String),
	#[error("{0}")]
	#[schema(value_type = String)]
	PrismaError(#[from] QueryError),
}

impl From<CoreError> for ApiError {
	fn from(err: CoreError) -> Self {
		match err {
			CoreError::InternalError(err) => ApiError::InternalServerError(err),
			CoreError::IoError(err) => ApiError::InternalServerError(err.to_string()),
			CoreError::MigrationError(err) => ApiError::InternalServerError(err),
			CoreError::QueryError(err) => ApiError::InternalServerError(err.to_string()),
			CoreError::Unknown(err) => ApiError::InternalServerError(err),
			CoreError::Utf8ConversionError(err) => {
				ApiError::InternalServerError(err.to_string())
			},
			CoreError::XmlWriteError(err) => {
				ApiError::InternalServerError(err.to_string())
			},
			_ => ApiError::InternalServerError(err.to_string()),
		}
	}
}

impl From<AuthError> for ApiError {
	fn from(error: AuthError) -> ApiError {
		match error {
			AuthError::BcryptError(_) => {
				ApiError::InternalServerError("Internal server error".to_string())
			},
			AuthError::BadCredentials => {
				ApiError::BadRequest("Missing or malformed credentials".to_string())
			},
			AuthError::BadRequest => ApiError::BadRequest(
				"The Authorization header could no be parsed".to_string(),
			),
			AuthError::Unauthorized => ApiError::Unauthorized,
			AuthError::Forbidden => ApiError::Forbidden("Forbidden".to_string()),
		}
	}
}

impl From<bcrypt::BcryptError> for ApiError {
	fn from(error: bcrypt::BcryptError) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl From<mpsc::error::SendError<InternalCoreTask>> for ApiError {
	fn from(err: mpsc::error::SendError<InternalCoreTask>) -> Self {
		ApiError::InternalServerError(err.to_string())
	}
}

impl From<prisma_client_rust::RelationNotFetchedError> for ApiError {
	fn from(e: prisma_client_rust::RelationNotFetchedError) -> Self {
		ApiError::InternalServerError(e.to_string())
	}
}

impl From<ProcessFileError> for ApiError {
	fn from(error: ProcessFileError) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl From<std::io::Error> for ApiError {
	fn from(error: std::io::Error) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl IntoResponse for ApiError {
	fn into_response(self) -> Response {
		match self {
			ApiError::BadRequest(err) => (StatusCode::BAD_REQUEST, err),
			ApiError::NotFound(err) => (StatusCode::NOT_FOUND, err),
			ApiError::InternalServerError(err) => {
				(StatusCode::INTERNAL_SERVER_ERROR, err)
			},
			ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
			ApiError::Forbidden(err) => (StatusCode::FORBIDDEN, err),
			ApiError::NotImplemented => (StatusCode::NOT_IMPLEMENTED, self.to_string()),
			ApiError::ServiceUnavailable(err) => (StatusCode::SERVICE_UNAVAILABLE, err),
			ApiError::BadGateway(err) => (StatusCode::BAD_GATEWAY, err),
			ApiError::PrismaError(e) => {
				if e.is_prisma_error::<RecordNotFound>() {
					(StatusCode::NOT_FOUND, e.to_string())
				} else if e.is_prisma_error::<UniqueKeyViolation>() {
					(StatusCode::UNPROCESSABLE_ENTITY, e.to_string())
				} else {
					(StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
				}
			},
			ApiError::Redirect(err) => (StatusCode::TEMPORARY_REDIRECT, err),
			_ => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
		}
		.into_response()
	}
}
