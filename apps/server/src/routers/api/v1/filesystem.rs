use axum::{extract::Query, middleware, routing::post, Extension, Json, Router};
use std::{
	fs::DirEntry,
	path::{Path, PathBuf},
};
use stump_core::{
	db::{
		entity::UserPermission,
		query::pagination::{PageQuery, Pageable},
	},
	filesystem::{DirectoryListing, DirectoryListingFile, DirectoryListingInput},
};
use tracing::trace;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, RequestContext},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/filesystem", post(list_directory))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

#[utoipa::path(
	post,
	path = "/api/v1/filesystem",
	tag = "filesystem",
	request_body = Option<DirectoryListingInput>,
	params(
		("pagination" = Option<PageQuery>, Query, description = "Pagination parameters for the directory listing.")
	),
	responses(
		(status = 200, description = "Successfully retrieved contents of directory", body = PageableDirectoryListing),
		(status = 400, description = "Invalid request."),
		(status = 401, description = "No user is logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 404, description = "Directory does not exist."),
	)
)]

/// List the contents of a directory on the file system at a given (optional) path. If no path
/// is provided, the file system root directory contents is returned.
pub async fn list_directory(
	pagination: Query<PageQuery>,
	Extension(req): Extension<RequestContext>,
	Json(input): Json<Option<DirectoryListingInput>>,
) -> APIResult<Json<Pageable<DirectoryListing>>> {
	req.enforce_permissions(&[UserPermission::FileExplorer])?;
	let input = input.unwrap_or_default();

	let start_path = input
		.path
		.map(PathBuf::from)
		.unwrap_or_else(get_os_start_path);

	if !start_path.exists() {
		return Err(APIError::NotFound(format!(
			"Directory does not exist: {}",
			start_path.display()
		)));
	} else if !start_path.is_absolute() {
		return Err(APIError::BadRequest(format!(
			"Path must be absolute: {}",
			start_path.display()
		)));
	}

	// Set defaults for paging
	let page = pagination.page.unwrap_or(1);
	let page_size = pagination.page_size.unwrap_or(100);

	let mut files = read_and_filter_directory(&start_path)?;

	// Sort the files by name, ignore case
	files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

	trace!(
		"{} files in directory listing for: {}",
		files.len(),
		start_path.display()
	);

	Ok(Json(Pageable::from((
		DirectoryListing {
			parent: start_path
				.parent()
				.and_then(|p| p.to_str())
				.map(|p| p.to_string()),
			files,
		},
		page,
		page_size,
	))))
}

fn get_os_start_path() -> PathBuf {
	#[cfg(target_os = "windows")]
	return Path::new("C:\\").into();
	#[cfg(target_family = "unix")]
	return Path::new("/").into();
}

fn read_and_filter_directory(
	start_path: &Path,
) -> Result<Vec<DirectoryListingFile>, std::io::Error> {
	let listing = std::fs::read_dir(start_path)?;

	let files = listing
		.filter_map(|res| res.ok())
		.filter_map(filter_if_hidden)
		.map(|entry| DirectoryListingFile::from(entry.path()))
		.collect();

	Ok(files)
}

fn filter_if_hidden(entry: DirEntry) -> Option<DirEntry> {
	let path = entry.path();
	let stem = path.file_stem().unwrap_or_default();

	// Remove hidden files starting with period
	if stem.to_str().unwrap_or_default().starts_with('.') {
		return None;
	}

	Some(entry)
}
