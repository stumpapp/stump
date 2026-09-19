use std::{fs, path::PathBuf};

pub fn workspace_root() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
		.parent() // crates
		.and_then(|p| p.parent()) // workspace root
		.expect("Failed to locate workspace root")
		.to_path_buf()
}

pub fn test_data_dir() -> PathBuf {
	workspace_root().join("core/integration-tests/data")
}

pub fn get_test_zip_path() -> String {
	test_data_dir()
		.join("book.zip")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_complex_zip_path() -> String {
	test_data_dir()
		.join("book-complex-tree.zip")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_rar_path() -> String {
	test_data_dir()
		.join("book.rar")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_rar_file_data() -> Vec<u8> {
	fs::read(get_test_rar_path()).expect("Failed to read test rar file")
}

pub fn get_test_complex_rar_path() -> String {
	test_data_dir()
		.join("book-complex-tree.rar")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_epub_path() -> String {
	test_data_dir()
		.join("book.epub")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_pdf_path() -> String {
	test_data_dir()
		.join("rust_book.pdf")
		.to_string_lossy()
		.to_string()
}

pub fn get_test_cbz_path() -> String {
	test_data_dir()
		.join("science_comics_001.cbz")
		.to_string_lossy()
		.to_string()
}

/// Note: each page should be 96623 bytes. The macOS metadata files should be 220 bytes, but
/// ignored by the processor. Commenting the sizes for posterity.
pub fn get_nested_macos_compressed_cbz_path() -> String {
	test_data_dir()
		.join("nested-macos-compressed.cbz")
		.to_string_lossy()
		.to_string()
}
