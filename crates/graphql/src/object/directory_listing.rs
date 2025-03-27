use std::path::PathBuf;

use async_graphql::SimpleObject;
use stump_core::filesystem::PathUtils;

#[derive(Debug, Clone, SimpleObject)]
pub struct DirectoryListing {
	pub parent: Option<String>,
	pub files: Vec<DirectoryListingFile>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct DirectoryListingFile {
	pub is_directory: bool,
	pub name: String,
	pub path: String,
}

impl DirectoryListingFile {
	pub fn new(is_directory: bool, name: &str, path: &str) -> Self {
		Self {
			is_directory,
			name: name.to_string(),
			path: path.to_string(),
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
			path: path.to_string_lossy().to_string(),
		}
	}
}
