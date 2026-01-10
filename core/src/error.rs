use std::io;

use derive_builder::UninitializedFieldError;
use thiserror::Error;

pub type CoreResult<T> = Result<T, CoreError>;

#[derive(Error, Debug)]
pub enum CoreError {
	#[error(
		"Attempted to initialize StumpCore with a config dir that does not exist: {0}"
	)]
	ConfigDirDoesNotExist(String),
	#[error("Failed to build entity: {0}")]
	EntityBuilderError(#[from] UninitializedFieldError),
	#[error("Encryption key must be set")]
	EncryptionKeyNotSet,
	#[error("Failed to encrypt: {0}")]
	EncryptionFailed(String),
	#[error("Failed to decrypt: {0}")]
	DecryptionFailed(String),
	#[error("Failed to initialize Stump core: {0}")]
	InitializationError(String),
	#[error("{0}")]
	EmailerError(#[from] email::EmailError),
	#[error(
		"An attempt was made to reset the database, which is not allowed in this context"
	)]
	DatabaseResetNotAllowed,
	#[error("Query error: {0}")]
	DBError(#[from] sea_orm::error::DbErr),
	#[error("Invalid query error: {0}")]
	InvalidQuery(String),
	#[error("Migration error: {0}")]
	MigrationError(String),
	#[error("Failed to parse regex patterns into globset: {0}")]
	GlobSetError(#[from] globset::Error),
	#[error("Requested resource could not be found: {0}")]
	NotFound(String),
	#[error("{0}")]
	BadRequest(String),
	#[error("Requested file could not be found: {0}")]
	FileNotFound(String),
	#[error("Failed to read file: {0}")]
	IoError(#[from] io::Error),
	#[error("Failed to create XML feed: {0}")]
	XmlWriteError(#[from] xml::writer::Error),
	#[error("Failed to create string: {0}")]
	Utf8ConversionError(#[from] std::string::FromUtf8Error),
	#[error("Failed to initialize job: {0}")]
	JobInitializationError(String),
	#[error("{0}")]
	InternalError(String),
	#[error("This feature is not yet implemented: {0}")]
	UnImplemented(String),
	#[error("An object failed to (de)serialize: {0}")]
	SerdeFailure(#[from] serde_json::Error),
	#[error("An unknown error occurred: {0}")]
	Unknown(String),
}

impl From<chrono::ParseError> for CoreError {
	fn from(error: chrono::ParseError) -> Self {
		Self::InternalError(error.to_string())
	}
}
