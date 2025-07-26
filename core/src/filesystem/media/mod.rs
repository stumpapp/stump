pub mod analyze_media_job;
mod builder;
mod format;
mod metadata;
mod process;
mod utils;

pub use crate::filesystem::media::epub::EpubProcessor;
pub(crate) use builder::{BuiltMedia, MediaBuilder};
pub use format::*;
pub use metadata::*;
pub use process::*;
pub use utils::is_accepted_cover_name;

#[cfg(test)]
pub(crate) mod tests {
	use std::{fs, path::PathBuf};

	pub fn get_test_zip_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book.zip")
			.to_string_lossy()
			.to_string()
	}

	pub fn get_test_complex_zip_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book-complex-tree.zip")
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

	pub fn get_test_complex_rar_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book-complex-tree.rar")
			.to_string_lossy()
			.to_string()
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

	// Note: each page should be 96623 bytes. The macOS metadata files should be 220 bytes, but
	// ignored by the processor. Commenting the sizes for posterity.
	pub fn get_nested_macos_compressed_cbz_path() -> String {
		PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/nested-macos-compressed.cbz")
			.to_string_lossy()
			.to_string()
	}
}
