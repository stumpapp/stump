use rocket::{
	http::Status,
	response::{self, Responder},
	Request, Response,
};
use rocket_session_store::SessionError;
use std::io::Cursor;
use thiserror::Error;
// use unrar::error::UnrarError;
use zip::result::ZipError;

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
	#[error("The session is not valid")]
	InvalidSession(#[from] SessionError),
}

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
pub enum ScanError {
	#[error("A query error occurred: {0}")]
	QueryError(String),
	#[error("Unsupported file: {0}")]
	UnsupportedFile(String),
	#[error("{0}")]
	Unknown(String),
}

impl From<ProcessFileError> for ScanError {
	fn from(e: ProcessFileError) -> Self {
		match e {
			ProcessFileError::UnsupportedFileType => {
				ScanError::UnsupportedFile(e.to_string())
			},
			_ => ScanError::Unknown(e.to_string()),
		}
	}
}

impl From<prisma_client_rust::Error> for ScanError {
	fn from(e: prisma_client_rust::Error) -> Self {
		ScanError::QueryError(e.to_string())
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

impl From<prisma_client_rust::Error> for ApiError {
	fn from(error: prisma_client_rust::Error) -> ApiError {
		ApiError::InternalServerError(error.to_string())
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
			AuthError::Unauthorized => ApiError::Unauthorized("Unauthorized".to_string()),
			AuthError::InvalidSession(_) => {
				ApiError::InternalServerError("Internal server error".to_string())
			},
		}
	}
}

impl From<SessionError> for ApiError {
	fn from(error: SessionError) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl From<ProcessFileError> for ApiError {
	fn from(error: ProcessFileError) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl From<anyhow::Error> for ApiError {
	fn from(error: anyhow::Error) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl From<String> for ApiError {
	fn from(msg: String) -> ApiError {
		ApiError::InternalServerError(msg)
	}
}

impl From<&str> for ApiError {
	fn from(msg: &str) -> ApiError {
		ApiError::InternalServerError(msg.to_string())
	}
}

impl From<std::num::TryFromIntError> for ApiError {
	fn from(error: std::num::TryFromIntError) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl From<std::io::Error> for ApiError {
	fn from(error: std::io::Error) -> ApiError {
		ApiError::InternalServerError(error.to_string())
	}
}

impl From<bcrypt::BcryptError> for ApiError {
	fn from(error: bcrypt::BcryptError) -> ApiError {
		ApiError::InternalServerError(error.to_string())
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
