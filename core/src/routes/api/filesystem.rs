use std::path::Path;

use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	guards::auth::AdminGuard,
	types::{
		alias::ApiResult,
		errors::ApiError,
		models::list_directory::{
			DirectoryListing, DirectoryListingFile, DirectoryListingInput,
		},
	},
};

/// List the contents of a directory on the file system at a given (optional) path. If no path
/// is provided, the file system root directory contents is returned.
#[openapi(tag = "FileSystem")]
#[post("/filesystem", data = "<input>")]
pub async fn list_directory(
	_auth: AdminGuard,
	input: Option<Json<DirectoryListingInput>>,
) -> ApiResult<Json<DirectoryListing>> {
	let input = match input {
		Some(i) => i.into_inner(),
		None => DirectoryListingInput::default(),
	};

	let start_path = match input.path.clone() {
		Some(path) => path,
		None => "/".to_string(),
	};

	let start_path = Path::new(&start_path);

	if !start_path.exists() {
		return Err(ApiError::NotFound(format!(
			"Directory does not exist: {}",
			start_path.display()
		)));
	} else if !start_path.is_absolute() {
		return Err(ApiError::BadRequest(format!(
			"Path must be absolute: {}",
			start_path.display()
		)));
	}

	let listing = std::fs::read_dir(start_path)?;

	let mut files = listing
		.filter_map(|e| e.ok())
		.filter_map(|f| {
			let path = f.path();
			let stem = path.file_stem().unwrap_or_default();

			if stem.to_str().unwrap_or_default().starts_with(".") {
				return None;
			}

			Some(f)
		})
		.map(|entry| {
			let entry = entry;

			let path = entry.path();

			let name = path.file_name().unwrap().to_str().unwrap().to_string();
			let is_directory = path.is_dir();
			let path = path.to_string_lossy().to_string();

			DirectoryListingFile {
				name,
				is_directory,
				path,
			}
		})
		.collect::<Vec<DirectoryListingFile>>();

	files.sort_by(|a, b| a.name.cmp(&b.name));

	Ok(Json(DirectoryListing {
		parent: start_path
			.parent()
			.and_then(|p| p.to_str())
			.map(|p| p.to_string()),
		files,
	}))
}
