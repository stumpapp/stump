use crate::filesystem::{error::FileError, ContentType};

pub struct PdfProcessor;

pub fn get_page(_file: &str, _page: usize) -> Result<(ContentType, Vec<u8>), FileError> {
	Err(FileError::UnsupportedFileType(String::from(
		"Stump does not currently support PDF files",
	)))
}
