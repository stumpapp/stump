use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::filesystem::PathUtils;

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct DirectoryListingInput {
	pub path: Option<String>,
}

impl Default for DirectoryListingInput {
	fn default() -> Self {
		Self {
			path: Some("/".to_string()),
		}
	}
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
pub struct DirectoryListing {
	pub parent: Option<String>,
	pub files: Vec<DirectoryListingFile>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
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
