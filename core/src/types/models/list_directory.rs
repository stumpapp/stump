use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, Type)]
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

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, Type)]
pub struct DirectoryListing {
	pub parent: Option<String>,
	pub files: Vec<DirectoryListingFile>,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, Type)]
pub struct DirectoryListingFile {
	pub is_directory: bool,
	pub name: String,
	pub path: String,
}

impl DirectoryListingFile {
	pub fn new(is_directory: bool, name: &str, path: &str) -> DirectoryListingFile {
		DirectoryListingFile {
			is_directory,
			name: name.to_string(),
			path: path.to_string(),
		}
	}

	pub fn file(name: &str, path: &str) -> DirectoryListingFile {
		DirectoryListingFile::new(false, name, path)
	}

	pub fn directory(name: &str, path: &str) -> DirectoryListingFile {
		DirectoryListingFile::new(true, name, path)
	}
}
