use std::io;

use thiserror::Error;
use unrar::error::UnrarError;
use zip::result::ZipError;

use crate::error::CoreError;

#[derive(Error, Debug)]
pub enum FileError {
	#[error("Error occurred while opening file: {0}")]
	FileIoError(#[from] io::Error),
	#[error("A zip error occurred: {0}")]
	ZipFileError(#[from] ZipError),
	#[error("Archive contains no files")]
	ArchiveEmptyError,
	#[error("Failed to deserialize file: {0}")]
	DeserializeError(#[from] serde_json::Error),
	#[error("Unable to open .epub file: {0}")]
	EpubOpenError(String),
	#[error("Error while attempting to read .epub file: {0}")]
	EpubReadError(String),
	#[error("Could not find an image")]
	NoImageError,
	#[error("{0}")]
	PdfError(#[from] pdf::error::PdfError),
	#[error("{0}")]
	PdfRendererError(#[from] pdfium_render::prelude::PdfiumError),
	#[error("Stump is not properly configured to render PDFs")]
	PdfConfigurationError,
	#[error("Failed to process PDF file: {0}")]
	PdfProcessingError(String),
	#[error("{0}")]
	RarError(#[from] UnrarError),
	#[error("Failed to open rar archive: {0}")]
	RarNulError(#[from] unrar::error::NulError),
	#[error("Could not open rar file")]
	RarOpenError,
	#[error("Error extracting RAR file: {0}")]
	RarExtractError(String),
	#[error("Error reading RAR file")]
	RarReadError,
	#[error("Error reading RAR byte content")]
	RarByteReadError(#[from] std::str::Utf8Error),
	#[error("Unsupported file type: {0}")]
	UnsupportedFileType(String),
	#[error("{0}")]
	ImageIoError(#[from] image::ImageError),
	#[error("Failed to encode image to webp: {0}")]
	WebpEncodeError(String),
	#[error("Failed to read directory")]
	DirectoryReadError,
	#[error("Incorrect image processor for requested format")]
	IncorrectProcessorError,
	#[error("An unknown error occurred: {0}")]
	UnknownError(String),
}

impl From<FileError> for CoreError {
	fn from(error: FileError) -> Self {
		match error {
			FileError::FileIoError(err) => CoreError::IoError(err),
			FileError::UnknownError(err) => CoreError::Unknown(err),
			_ => CoreError::InternalError(error.to_string()),
		}
	}
}

#[derive(Error, Debug)]
pub enum ScanError {
	#[error("Unsupported file: {0}")]
	UnsupportedFile(String),
	#[error("Failed to build globset from invalid .stumpignore file: {0}")]
	GlobParseError(#[from] globset::Error),
	#[error("{0}")]
	Unknown(String),
}

impl From<FileError> for ScanError {
	fn from(e: FileError) -> Self {
		match e {
			FileError::UnsupportedFileType(_) => {
				ScanError::UnsupportedFile(e.to_string())
			},
			_ => ScanError::Unknown(e.to_string()),
		}
	}
}
