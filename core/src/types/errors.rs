use std::io;

use prisma_client_rust::RelationNotFetchedError;
use thiserror::Error;
use zip::result::ZipError;

#[derive(Error, Debug)]
pub enum CoreError {
	#[error("Failed to initialize Stump core: {0}")]
	InitializationError(String),
	#[error("Query error: {0}")]
	QueryError(#[from] prisma_client_rust::queries::QueryError),
	#[error("Invalid query error: {0}")]
	InvalidQuery(String),
	#[error("Invalid usage of query result, failed to load relation: {0}")]
	RelationNotLoaded(#[from] RelationNotFetchedError),
	#[error("Migration error: {0}")]
	MigrationError(String),
	#[error("Requested resource could not be found: {0}")]
	NotFound(String),
	#[error("Requested file could not be found: {0}")]
	FileNotFound(String),
	#[error("Failed to read file: {0}")]
	IoError(#[from] io::Error),
	#[error("Failed to create XML feed: {0}")]
	XmlWriteError(#[from] xml::writer::Error),
	#[error("Failed to create string: {0}")]
	Utf8ConversionError(#[from] std::string::FromUtf8Error),
	#[error("Something went wrong: {0}")]
	InternalError(String),
	#[error("An unknown error ocurred: {0}")]
	Unknown(String),
}

#[derive(Error, Debug)]
pub enum ProcessFileError {
	#[error("Error occurred while opening file: {0}")]
	FileIoError(#[from] io::Error),
	#[error("A zip error ocurred: {0}")]
	ZipFileError(#[from] ZipError),
	#[error("Archive contains no files")]
	ArchiveEmptyError,
	#[error("Unable to open .epub file: {0}")]
	EpubOpenError(String),
	#[error("Error while attempting to read .epub file: {0}")]
	EpubReadError(String),
	// #[error("Error while attempting to read .pdf file")]
	// PdfReadError(#[from] pdf_rs::PdfError),
	#[error("Could not find an image")]
	NoImageError,
	#[error("Failed to open rar archive: {0}")]
	RarNulError(#[from] unrar::error::NulError),
	#[error("Could not open rar file")]
	RarOpenError,
	#[error("Could not extract rar file: {0}")]
	RarExtractError(String),
	#[error("Error reading file content in rar")]
	RarReadError,
	#[error("Error reading bytes from rar")]
	RarByteReadError(#[from] std::str::Utf8Error),
	#[error("Unsupported file type: {0}")]
	UnsupportedFileType(String),
	#[error("{0}")]
	ImageIoError(#[from] image::ImageError),
	#[error("Failed to encode image to webp: {0}")]
	WebpEncodeError(String),
	#[error("An unknown error occurred: {0}")]
	Unknown(String),
}

impl From<ProcessFileError> for CoreError {
	fn from(error: ProcessFileError) -> Self {
		match error {
			ProcessFileError::FileIoError(err) => CoreError::IoError(err),
			ProcessFileError::Unknown(err) => CoreError::Unknown(err),
			_ => CoreError::InternalError(error.to_string()),
		}
	}
}

#[derive(Error, Debug)]
pub enum ScanError {
	#[error("A query error occurred: {0}")]
	QueryError(String),
	#[error("Unsupported file: {0}")]
	UnsupportedFile(String),
	#[error("{0}")]
	FileParseError(String),
	#[error("Failed to build globset from invalid .stumpignore file: {0}")]
	GlobParseError(#[from] globset::Error),
	#[error("{0}")]
	Unknown(String),
}

impl From<ProcessFileError> for ScanError {
	fn from(e: ProcessFileError) -> Self {
		match e {
			ProcessFileError::UnsupportedFileType(_) => {
				ScanError::UnsupportedFile(e.to_string())
			},
			_ => ScanError::Unknown(e.to_string()),
		}
	}
}

impl From<prisma_client_rust::queries::QueryError> for ScanError {
	fn from(e: prisma_client_rust::queries::QueryError) -> Self {
		ScanError::QueryError(e.to_string())
	}
}
