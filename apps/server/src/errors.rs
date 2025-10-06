use axum::{
	extract::multipart::MultipartError,
	http::StatusCode,
	response::{IntoResponse, Response},
	Json,
};
use cli::CliError;
use stump_core::{
	error::CoreError,
	filesystem::{
		image::{ProcessorError, ThumbnailGenerateError},
		FileError,
	},
	job::error::JobManagerError,
	opds::v2_0::OPDSV2Error,
	CoreEvent,
};
use tokio::sync::mpsc;
use tower_sessions::session::Error as SessionError;

use std::{net, num::TryFromIntError};
use thiserror::Error;

use crate::config::session::delete_cookie_header;

/// A type alias for the result of a server operation
pub type ServerResult<T> = Result<T, ServerError>;
/// A type alias for the result of an API operation, e.g. the response of an axum handler
pub type APIResult<T> = Result<T, APIError>;

/// The top-level error type for the Stump server binary. The entry is a CLI app which either
/// performs a given command _or_ starts the server.
///
/// Note: If there is an invalid configuration, neither of these can happen, so there is a
/// separate error variant for that.
#[derive(Debug, Error)]
pub enum EntryError {
	#[error("{0}")]
	InvalidConfig(String),
	#[error("{0}")]
	CliError(#[from] CliError),
	#[error("{0}")]
	ServerError(#[from] ServerError),
}

/// A generic error type to encapsulate general server errors, which may include API errors, but
/// also includes other errors such as a failure to boot or bind to a port.
#[derive(Debug, Error)]
pub enum ServerError {
	// TODO: meh
	#[error("{0}")]
	ServerStartError(String),
	#[error("Stump failed to parse the provided address: {0}")]
	InvalidAddress(#[from] net::AddrParseError),
	#[error("{0}")]
	APIError(#[from] APIError),
}

/// Authentication errors, emitted during the authentication process and in instances where a user
/// is not authorized to access a resource/action.
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

/// The error representation for API errors. This is a simple enum which will be converted into a
/// JSON response containing the status code and the error message.
#[allow(unused)]
#[derive(Debug, Error)]
pub enum APIError {
	#[error("Your account has been locked by an administrator")]
	AccountLocked,
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
	#[error("This functionality is not supported")]
	NotSupported,
	#[error("{0}")]
	ServiceUnavailable(String),
	#[error("{0}")]
	BadGateway(String),
	#[error("{0}")]
	Unknown(String),
	#[error("{0}")]
	Redirect(String),
	#[error("{0}")]
	SessionFetchError(#[from] SessionError),
	#[error("{0}")]
	DbError(#[from] sea_orm::error::DbErr),
}

impl APIError {
	/// A helper function to get the status code for an APIError
	pub fn status_code(&self) -> StatusCode {
		match self {
			APIError::AccountLocked => StatusCode::FORBIDDEN,
			APIError::BadRequest(_) => StatusCode::BAD_REQUEST,
			APIError::NotFound(_) => StatusCode::NOT_FOUND,
			APIError::InternalServerError(_) => StatusCode::INTERNAL_SERVER_ERROR,
			APIError::Unauthorized => StatusCode::UNAUTHORIZED,
			APIError::Forbidden(_) => StatusCode::FORBIDDEN,
			APIError::NotImplemented => StatusCode::NOT_IMPLEMENTED,
			APIError::ServiceUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
			APIError::BadGateway(_) => StatusCode::BAD_GATEWAY,
			APIError::DbError(sea_orm::error::DbErr::RecordNotFound(_)) => {
				StatusCode::NOT_FOUND
			},
			APIError::DbError(_) => StatusCode::INTERNAL_SERVER_ERROR,
			APIError::Redirect(_) => StatusCode::TEMPORARY_REDIRECT,
			_ => StatusCode::INTERNAL_SERVER_ERROR,
		}
	}
}

impl From<OPDSV2Error> for APIError {
	fn from(error: OPDSV2Error) -> Self {
		APIError::InternalServerError(error.to_string())
	}
}

impl From<MultipartError> for APIError {
	fn from(error: MultipartError) -> Self {
		APIError::InternalServerError(error.to_string())
	}
}

impl From<prefixed_api_key::BuilderError> for APIError {
	fn from(error: prefixed_api_key::BuilderError) -> Self {
		APIError::InternalServerError(error.to_string())
	}
}

impl From<reqwest::Error> for APIError {
	fn from(error: reqwest::Error) -> Self {
		APIError::InternalServerError(error.to_string())
	}
}

impl From<ThumbnailGenerateError> for APIError {
	fn from(value: ThumbnailGenerateError) -> Self {
		APIError::InternalServerError(value.to_string())
	}
}

impl APIError {
	pub fn forbidden_discreet() -> APIError {
		APIError::Forbidden(String::from(
			"You do not have permission to access this resource.",
		))
	}
}

impl From<TryFromIntError> for APIError {
	fn from(e: TryFromIntError) -> Self {
		APIError::InternalServerError(e.to_string())
	}
}

impl From<CoreError> for APIError {
	fn from(err: CoreError) -> Self {
		match err {
			CoreError::InternalError(err) => APIError::InternalServerError(err),
			CoreError::IoError(err) => APIError::InternalServerError(err.to_string()),
			CoreError::MigrationError(err) => APIError::InternalServerError(err),
			CoreError::Unknown(err) => APIError::InternalServerError(err),
			CoreError::Utf8ConversionError(err) => {
				APIError::InternalServerError(err.to_string())
			},
			CoreError::XmlWriteError(err) => {
				APIError::InternalServerError(err.to_string())
			},
			_ => APIError::InternalServerError(err.to_string()),
		}
	}
}

impl From<JobManagerError> for APIError {
	fn from(error: JobManagerError) -> Self {
		APIError::InternalServerError(error.to_string())
	}
}

impl From<AuthError> for APIError {
	fn from(error: AuthError) -> APIError {
		match error {
			AuthError::BcryptError(_) => {
				APIError::InternalServerError("Internal server error".to_string())
			},
			AuthError::BadCredentials => {
				APIError::BadRequest("Missing or malformed credentials".to_string())
			},
			AuthError::BadRequest => APIError::BadRequest(
				"The Authorization header could no be parsed".to_string(),
			),
			AuthError::Unauthorized => APIError::Unauthorized,
			AuthError::Forbidden => APIError::Forbidden("Forbidden".to_string()),
		}
	}
}

impl From<bcrypt::BcryptError> for APIError {
	fn from(error: bcrypt::BcryptError) -> APIError {
		APIError::InternalServerError(error.to_string())
	}
}

impl From<mpsc::error::SendError<CoreEvent>> for APIError {
	fn from(err: mpsc::error::SendError<CoreEvent>) -> Self {
		APIError::InternalServerError(err.to_string())
	}
}

impl From<FileError> for APIError {
	fn from(error: FileError) -> APIError {
		APIError::InternalServerError(error.to_string())
	}
}

impl From<ProcessorError> for APIError {
	fn from(error: ProcessorError) -> APIError {
		match error {
			ProcessorError::InvalidQuality => APIError::BadRequest(error.to_string()),
			ProcessorError::InvalidSizedImage => APIError::BadRequest(error.to_string()),
			ProcessorError::InvalidConfiguration(err) => {
				APIError::BadRequest(err.to_string())
			},
			_ => APIError::InternalServerError(error.to_string()),
		}
	}
}

impl From<std::io::Error> for APIError {
	fn from(error: std::io::Error) -> APIError {
		APIError::InternalServerError(error.to_string())
	}
}

/// The response body for API errors. This is just a basic JSON response with a status code and a message.
/// Any axum handlers which return a [`Result`] with an Error of [`APIError`] will be converted into this response.
#[derive(Debug)]
pub struct APIErrorResponse {
	status: StatusCode,
	message: String,
}

impl From<APIError> for APIErrorResponse {
	fn from(error: APIError) -> Self {
		APIErrorResponse {
			status: error.status_code(),
			message: error.to_string(),
		}
	}
}

impl IntoResponse for APIErrorResponse {
	fn into_response(self) -> Response {
		let body = serde_json::json!({
			"status": self.status.as_u16(),
			"message": self.message,
		});

		tracing::error!(error = ?self, "API error response");

		let base_response = Json(body).into_response();

		let mut builder = Response::builder()
			.status(self.status)
			.header("Content-Type", "application/json");

		// if the status is 401, we want to encourage the client to delete their
		// session cookie
		if self.status == StatusCode::UNAUTHORIZED {
			let (name, value) = delete_cookie_header();
			builder = builder.header(name, value);
		}

		builder
			.body(base_response.into_body())
			.unwrap_or_else(|error| {
				tracing::error!(?error, "Failed to build response");
				(StatusCode::INTERNAL_SERVER_ERROR, error.to_string()).into_response()
			})
	}
}

impl IntoResponse for APIError {
	fn into_response(self) -> Response {
		APIErrorResponse::from(self).into_response()
	}
}

pub mod api_error_message {
	pub const LOCKED_ACCOUNT: &str =
		"Your account is locked. Please contact an administrator to unlock your account.";
}
