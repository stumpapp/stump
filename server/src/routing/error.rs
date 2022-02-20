use rocket::{
    http::Status,
    response::{self, Responder},
    Request, Response,
};
use std::{fmt::Error, io::Cursor};
use unrar::error::UnrarError;
use zip::result::ZipError;
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

#[derive(Error, Debug)]
pub enum ProcessFileError {
    // #[error("Invalid Archive")]
    // InvalidArchive,
    #[error("Error occurred while opening file: {0}")]
    FileIoError(#[from] std::io::Error),
    #[error("Could not read archive file")]
    ArchiveReadError(#[from] ZipError),
    #[error("Archive contains no files")]
    ArchiveEmptyError,
    #[error("Error while attempting to read .epub file: {0}")]
    EpubReadError(String),
    // #[error("Error while attempting to read .pdf file")]
    // PdfReadError(#[from] pdf_rs::PdfError),
    #[error("Could not find an image")]
    NoImageError,
    #[error("Could not open rar file")]
    RarOpenError,
    #[error("Error reading file content in rar")]
    RarReadError,
    #[error("Error reading bytes from rar")]
    RarByteReadError(#[from] std::str::Utf8Error),
    #[error("Invalid file type")]
    UnsupportedFileType,
    #[error("An unknown error occurred: {0}")]
    Unknown(String),
}

#[rustfmt::skip]
impl Into<ApiError> for ProcessFileError {
    fn into(self) -> ApiError {
        match self {
            ProcessFileError::FileIoError(e) => ApiError::InternalServerError(e.to_string()),
            ProcessFileError::ArchiveReadError(_) => ApiError::InternalServerError("Could not read archive file".to_string()),
            ProcessFileError::ArchiveEmptyError => ApiError::InternalServerError("Archive contains no files".to_string()),
            ProcessFileError::EpubReadError(_) => ApiError::InternalServerError("Error while attempting to read .epub file".to_string()),
            // ProcessFileError::PdfReadError(_) => ApiError::InternalServerError("Error while attempting to read .pdf file".to_string()),
            ProcessFileError::NoImageError => ApiError::InternalServerError("Could not find an image".to_string()),
            ProcessFileError::RarOpenError => ApiError::InternalServerError("Could not open rar file".to_string()),
            ProcessFileError::RarReadError => ApiError::InternalServerError("Error reading file content in rar".to_string()),
            ProcessFileError::RarByteReadError(_) => ApiError::InternalServerError("Error reading bytes from rar".to_string()),
            ProcessFileError::UnsupportedFileType => ApiError::InternalServerError("Invalid file type".to_string()),
            // ProcessFileError::Unknown => ApiError::InternalServerError("unknown error occurred".to_string()),
            _ => ApiError::InternalServerError("Internal error occurred".to_string()),
        }
    }
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
