use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::filesystem::PathUtils;

fn default_true() -> bool {
	true
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DirectoryListingInput {
	pub path: Option<String>,
	#[serde(flatten, default)]
	pub ignore_params: DirectoryListingIgnoreParams,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DirectoryListingIgnoreParams {
	#[serde(default = "default_true")]
	pub ignore_hidden: bool,
	#[serde(default)]
	pub ignore_files: bool,
	#[serde(default)]
	pub ignore_directories: bool,
}

impl Default for DirectoryListingIgnoreParams {
	fn default() -> Self {
		Self {
			ignore_hidden: true,
			ignore_files: false,
			ignore_directories: false,
		}
	}
}

impl Default for DirectoryListingInput {
	fn default() -> Self {
		Self {
			path: Some("/".to_string()),
			ignore_params: DirectoryListingIgnoreParams::default(),
		}
	}
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DirectoryListing {
	pub parent: Option<String>,
	pub files: Vec<DirectoryListingFile>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DirectoryListingFile {
	pub is_directory: bool,
	pub name: String,
	pub path: PathBuf,
}

impl DirectoryListingFile {
	pub fn new(is_directory: bool, name: &str, path: &str) -> Self {
		Self {
			is_directory,
			name: name.to_string(),
			path: Path::new(path).into(),
		}
	}

	pub fn file(name: &str, path: &str) -> Self {
		Self::new(false, name, path)
	}

	pub fn directory(name: &str, path: &str) -> Self {
		Self::new(true, name, path)
	}
}

impl From<PathBuf> for DirectoryListingFile {
	fn from(path: PathBuf) -> Self {
		Self {
			name: path.file_parts().file_name,
			is_directory: path.is_dir(),
			path,
		}
	}
}
