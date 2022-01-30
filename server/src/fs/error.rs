use thiserror::Error;
use unrar::{archive::Entry, error::UnrarError};
use zip::result::ZipError;

#[derive(Error, Debug)]
pub enum ProcessFileError {
    // #[error("Invalid Archive")]
    // InvalidArchive,
    #[error("Could not open archive file")]
    ArchiveOpenError(#[from] std::io::Error),
    #[error("Could not read archive file")]
    ArchiveReadError(#[from] ZipError),
    #[error("Archive contains no files")]
    ArchiveEmptyError,
    #[error("Could not find an image")]
    NoImageError,
    #[error("Could not open rar file")]
    RarOpenError,
    #[error("Error reading file content in rar")]
    RarReadError(#[from] std::str::Utf8Error),
    // #[error("Invalid file type")]
    // UnsupportedFileType,
    // #[error("unknown error occurred")]
    // Unknown,
}
