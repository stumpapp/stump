mod builder;
mod common;
pub(crate) mod epub;
pub mod pdf;
mod process;
pub mod rar;
pub mod zip;

pub use crate::filesystem::media::epub::EpubProcessor;
pub(crate) use builder::{MediaBuilder, SeriesBuilder};
pub use common::is_accepted_cover_name;
pub use process::{
	get_content_types_for_pages, get_page, process, FileProcessor, FileProcessorOptions,
	ProcessedFile, SeriesJson,
};

#[cfg(test)]
mod tests {
	use std::{fs, path::PathBuf};

	pub fn get_test_zip_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book.zip")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_rar_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book.rar")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_rar_file_data() -> Vec<u8> {
		let test_rar_path = get_test_rar_path();

		fs::read(test_rar_path).expect("Failed to fetch test rar file")
	}

	pub fn get_test_epub_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book.epub")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_pdf_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/rust_book.pdf")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_cbz_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/science_comics_001.cbz")
			.to_string_lossy()
			.to_string()
	}
}
