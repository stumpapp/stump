mod temp_core;
pub mod temp_library;

use std::{fs, path::PathBuf};

pub use temp_core::get_temp_core;

#[allow(dead_code)]
pub fn get_manifest_dir() -> PathBuf {
	PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

#[allow(dead_code)]
pub fn get_test_data_dir() -> PathBuf {
	get_manifest_dir().join("tests/data")
}

#[allow(dead_code)]
pub fn get_test_file_contents(name: &str) -> Vec<u8> {
	let path = get_test_data_dir().join(name);
	fs::read(path).unwrap_or_else(|_| panic!("Failed to read test file: {}", name))
}
