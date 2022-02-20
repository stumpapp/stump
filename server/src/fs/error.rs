// use pdf as pdf_rs;
use thiserror::Error;

use unrar::error::UnrarError;
use zip::result::ZipError;

#[derive(Error, Debug)]
pub enum ProcessFileError {
    // #[error("Invalid Archive")]
    // InvalidArchive,
    #[error("Could not open file")]
    ArchiveOpenError(#[from] std::io::Error),
    #[error("Could not read archive file")]
    ArchiveReadError(#[from] ZipError),
    #[error("Archive contains no files")]
    ArchiveEmptyError,
    #[error("Error while attempting to read .epub file")]
    EpubReadError,
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
    // #[error("unknown error occurred")]
    // Unknown,
}
