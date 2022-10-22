use axum::{extract::Query, middleware::from_extractor, routing::post, Json, Router};
use axum_sessions::extractors::ReadableSession;
use std::path::Path;
use stump_core::types::{
	DirectoryListing, DirectoryListingFile, DirectoryListingInput, Pageable,
	PagedRequestParams,
};
use tracing::trace;

use crate::{
	errors::{ApiError, ApiResult},
	middleware::auth::{AdminGuard, Auth},
	utils::get_session_user,
};

pub(crate) fn mount() -> Router {
	Router::new()
		.route("/filesystem", post(list_directory))
		.layer(from_extractor::<AdminGuard>())
		.layer(from_extractor::<Auth>())
}

/// List the contents of a directory on the file system at a given (optional) path. If no path
/// is provided, the file system root directory contents is returned.
pub async fn list_directory(
	input: Json<Option<DirectoryListingInput>>,
	session: ReadableSession,
	pagination: Query<PagedRequestParams>,
) -> ApiResult<Json<Pageable<DirectoryListing>>> {
	let user = get_session_user(&session)?;

	// FIXME: The auth extractor middleware doesn't check admin, but I don't want to have this check
	// here. I thought of making another extractor, but it would be the same code as the auth with
	// one additional check, which is way too much duplication for me. I'll have to look into
	// how I can extend middlewares, rather than just copy it from scratch...
	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You must be an admin to access this endpoint".to_string(),
		));
	}

	let input = input.0.unwrap_or_default();

	let start_path = input.path.unwrap_or_else(|| {
		#[cfg(target_os = "windows")]
		return "C:\\".to_string();
		#[cfg(target_family = "unix")]
		return "/".to_string();
	});
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
	let page = pagination.page.unwrap_or(1);
	let page_size = pagination.page_size.unwrap_or(100);

	let mut files = listing
		.filter_map(|e| e.ok())
		.filter_map(|f| {
			let path = f.path();
			let stem = path.file_stem().unwrap_or_default();

			if stem.to_str().unwrap_or_default().starts_with('.') {
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
