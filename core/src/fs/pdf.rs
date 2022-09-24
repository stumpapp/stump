use rocket::http::ContentType;

use crate::types::errors::ProcessFileError;

pub fn get_pdf_page(
	_file: &str,
	_page: usize,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	unimplemented!()
}
