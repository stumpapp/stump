use crate::prelude::{errors::ProcessFileError, ContentType};

pub fn get_page(
	_file: &str,
	_page: usize,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	unimplemented!()
}
