use std::{fmt::Error, io::Cursor};

use rocket::{
    http::Status,
    response::{self, Responder},
    Request, Response,
};
// use pdf as pdf_rs;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("{0}")]
    BadRequest(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    InternalServerError(String),
    #[error("{0}")]
    Unauthorized(String),
    #[error("{0}")]
    Forbidden(String),
    #[error("{0}")]
    NotImplemented(String),
    #[error("{0}")]
    ServiceUnavailable(String),
    #[error("{0}")]
    BadGateway(String),
    #[error("{0}")]
    Unknown(String),
    #[error("{0}")]
    Redirect(String),
}

impl From<ApiError> for Status {
    fn from(error: ApiError) -> Status {
        match error {
            ApiError::BadRequest(_) => Status::BadRequest,
            ApiError::NotFound(_) => Status::NotFound,
            ApiError::InternalServerError(_) => Status::InternalServerError,
            ApiError::Unauthorized(_) => Status::Unauthorized,
            ApiError::Forbidden(_) => Status::Forbidden,
            ApiError::NotImplemented(_) => Status::NotImplemented,
            ApiError::ServiceUnavailable(_) => Status::ServiceUnavailable,
            ApiError::BadGateway(_) => Status::BadGateway,
            ApiError::Unknown(_) => Status::InternalServerError,
            // TODO: is this the right status? 308?
            ApiError::Redirect(_) => Status::PermanentRedirect,
        }
    }
}

impl<'r> Responder<'r, 'static> for ApiError {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        let body = self.to_string();
        let status = Status::from(self);

        Response::build()
            .status(status)
            .sized_body(body.len(), Cursor::new(body))
            .ok()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
