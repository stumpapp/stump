use std::{
	io::Read,
	path::{self, PathBuf},
	sync::Arc,
};

use axum::{
	extract::{DefaultBodyLimit, Path, State},
	middleware,
	routing::post,
	Extension, Json, Router,
};
use axum_typed_multipart::{FieldData, TryFromMultipart, TypedMultipart};
use tempfile::NamedTempFile;
use tokio::fs;
use zip::read::ZipFile;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, AuthContext},
	routers::api::filters::library_not_hidden_from_user_filter,
};
use stump_core::{
	db::entity::{macros::library_path_with_options_select, User, UserPermission},
	filesystem::scanner::LibraryScanJob,
	prisma::{library, PrismaClient},
};

pub fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/upload",
			Router::new()
				.route("/libraries/{id}/books", post(upload_books))
				.route("/libraries/{id}/series", post(upload_series)),
		)
		.layer(DefaultBodyLimit::max(app_state.config.max_file_upload_size))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

type LibraryData = library_path_with_options_select::Data;

#[derive(TryFromMultipart)]
struct UploadBooksRequest {
	place_at: String,
	#[form_data(limit = "unlimited")]
	files: Vec<FieldData<NamedTempFile>>,
}

#[utoipa::path(
	post,
	path = "/api/v1/upload/libraries/{id}/books",
	tag = "library",
	request_body(content_type = "multipart/form-data", content = UploadBooksRequest),
	params(
		("id" = String, Path, description = "The library ID"),
	),
	responses(
		(status = 200, description = "Successfully added books"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn upload_books(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	TypedMultipart(books_request): TypedMultipart<UploadBooksRequest>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;

	let client = &ctx.db;
	let library = get_library(client, &id, &user).await?;

	// Validate and path that uploads will be placed at, account for possible full path
	let placement_path = get_books_path(&books_request, &library)?;

	// Check that it is a directory and already exists
	if !fs::metadata(&placement_path).await?.is_dir() {
		return Err(APIError::BadRequest(
			"Book uploads must be placed at an existing directory.".to_string(),
		));
	}

	for f in books_request.files {
		validate_book_file(&f)?;

		let file_name = f.metadata.file_name.as_ref().ok_or(APIError::BadRequest(
			"Uploaded files must have filenames.".to_string(),
		))?;
		let target_path = placement_path.join(file_name);

		copy_tempfile_to_location(f, &target_path).await?;
	}

	// Start a scan of the library
	ctx.enqueue_job(LibraryScanJob::new(id, library.path, None))
		.map_err(|e| {
			tracing::error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;

	Ok(Json(()))
}

#[derive(TryFromMultipart)]
struct UploadSeriesRequest {
	place_at: String,
	series_dir_name: String,
	#[form_data(limit = "unlimited")]
	file: FieldData<NamedTempFile>,
}

#[utoipa::path(
	post,
	path = "/api/v1/upload/libraries/{id}/series",
	tag = "library",
	request_body(content_type = "multipart/form-data", content = UploadSeriesRequest),
	params(
		("id" = String, Path, description = "The library ID"),
	),
	responses(
		(status = 200, description = "Successfully added series"),
		(status = 401, description = "Unauthorized"),
		(status = 404, description = "Library not found"),
		(status = 500, description = "Internal server error")
	)
)]
async fn upload_series(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
	TypedMultipart(series_request): TypedMultipart<UploadSeriesRequest>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;

	// Validate the provided file, exit early on failure.
	validate_series_upload(&series_request)?;

	let client = &ctx.db;
	let library = get_library(client, &id, &user).await?;

	// Validate the placement path parameters and create the full path, error otherwise
	let placement_path = get_series_path(&series_request, &library)?;

	// Validate the contents of the zip file
	validate_series_upload_contents(&series_request, &placement_path, false)?;

	// Create directory if necessary
	if let Err(e) = fs::metadata(&placement_path).await {
		if e.kind() == tokio::io::ErrorKind::NotFound {
			fs::create_dir_all(&placement_path).await?;
		} else {
			return Err(APIError::InternalServerError(format!(
				"Error accessing directory {placement_path:?}: {e}"
			)));
		}
	}

	// Get a zip crate file handle to the temporary file
	let temp_file = series_request.file.contents.as_file().try_clone()?;
	let mut zip_archive = zip::ZipArchive::new(temp_file).map_err(|e| {
		APIError::InternalServerError(format!("Error opening zip archive: {e}"))
	})?;
	// Extract the contents
	zip_archive.extract(placement_path).map_err(|e| {
		APIError::InternalServerError(format!("Error unpacking zip archive: {e}"))
	})?;

	// Start a scan of the library
	ctx.enqueue_job(LibraryScanJob::new(id, library.path, None))
		.map_err(|e| {
			tracing::error!(?e, "Failed to enqueue library scan job");
			APIError::InternalServerError(
				"Failed to enqueue library scan job".to_string(),
			)
		})?;

	Ok(Json(()))
}

/// A helper function to copy a tempfile from a multipart to a provided path
async fn copy_tempfile_to_location(
	field_data: FieldData<NamedTempFile>,
	target_path: &path::Path,
) -> APIResult<()> {
	// We want to prevent overwriting something that already exists
	if fs::metadata(target_path).await.is_ok() {
		return Err(APIError::BadRequest(format!(
			"File already exists at {target_path:?}",
		)));
	}

	// Get a tokio::fs::File for the temporary file
	let mut temp_file = fs::File::from_std(field_data.contents.into_file());

	// Copy the bytes to the target location
	let mut target_file = fs::File::create(target_path).await?;
	tokio::io::copy(&mut temp_file, &mut target_file).await?;

	Ok(())
}

/// A helper function to validate the file used for a books upload, this function
/// will return an error if the file is not the appropriate file type.
fn validate_book_file(f: &FieldData<NamedTempFile>) -> APIResult<()> {
	/// Any file extension not in this list will trigger an error
	const ALLOWED_EXTENSIONS: &[&str] = &["cbr", "cbz", "epub", "pdf"];

	/// Any inferred mime type not in this list will trigger an error
	const ALLOWED_TYPES: &[&str] = &[
		"application/zip",
		"application/vnd.comicbook+zip",
		"application/vnd.comicbook-rar",
		"application/epub+zip",
		"application/pdf",
	];

	let file_name = f.metadata.file_name.as_ref().ok_or(APIError::BadRequest(
		"Uploaded files must have filenames.".to_string(),
	))?;

	let extension = path::Path::new(file_name)
		.extension()
		.and_then(|ext| ext.to_str())
		.map(str::to_ascii_lowercase)
		.ok_or_else(|| {
			APIError::BadRequest(format!(
				"Expected file {file_name} to have an extension."
			))
		})?;

	if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
		return Err(APIError::BadRequest(format!(
			"File {file_name} has a disallowed extension, permitted extensions are: {ALLOWED_EXTENSIONS:?}"
		)));
	}

	// Read first five bytes from which to infer content type
	let mut f_read = f.contents.reopen()?;
	let mut magic_bytes = [0u8; 5];
	f_read.read_exact(&mut magic_bytes).map_err(|_| {
		APIError::InternalServerError(
			"Failed to read first five bytes of zip file.".to_string(),
		)
	})?;

	let inferred_type = infer::get(&magic_bytes)
		.ok_or(APIError::InternalServerError(format!(
			"Unable to infer type for file {file_name}"
		)))?
		.mime_type();

	if !ALLOWED_TYPES.contains(&inferred_type) {
		return Err(APIError::InternalServerError(format!(
			"File {file_name} has a disallowed mime type: {inferred_type}, permitted types are: {ALLOWED_TYPES:?}"
		)));
	}

	Ok(())
}

/// A helper function to validate the file used for a series upload, this function
/// will return an error if the file is not the appropriate file type.
fn validate_series_upload(series_request: &UploadSeriesRequest) -> APIResult<()> {
	/// Any content type for a series upload that is not in this list will trigger an error.
	const PERMITTED_CONTENT_TYPES: &[&str] =
		&["application/zip", "application/x-zip-compressed"];

	// Check extension
	if let Some(file_name) = &series_request.file.metadata.file_name {
		if !file_name.to_ascii_lowercase().ends_with(".zip") {
			return Err(APIError::BadRequest(format!(
				"Invalid file extension: {file_name}. Only zip files are allowed."
			)));
		}
	} else {
		return Err(APIError::BadRequest(
			"Invalid file provided, expected file to have a filename.".to_string(),
		));
	}

	// Check content type
	if let Some(content_type) = &series_request.file.metadata.content_type {
		if !PERMITTED_CONTENT_TYPES.contains(&content_type.as_str()) {
			return Err(APIError::BadRequest(format!(
				"Invalid content-type: {content_type:?}. Only zip files are allowed."
			)));
		}
	} else {
		return Err(APIError::BadRequest(
			"Invalid content-type, expected uploaded series to have a content-type."
				.to_string(),
		));
	}

	Ok(())
}

/// Validate the contents of the series upload file. This function will return an error
/// if the contents of the uploaded archive do not match the permitted file types or if
/// the archive contains malformed paths.
fn validate_series_upload_contents(
	series_request: &UploadSeriesRequest,
	series_path: &path::Path,
	allow_overwrite: bool,
) -> APIResult<()> {
	let temp_file = series_request.file.contents.as_file().try_clone()?;
	let mut zip_archive = zip::ZipArchive::new(temp_file).map_err(|e| {
		APIError::InternalServerError(format!("Error opening zip archive: {e}"))
	})?;

	// Loop over each file in the zip archive and test them
	for i in 0..zip_archive.len() {
		let mut zip_file = zip_archive.by_index(i).map_err(|e| {
			APIError::InternalServerError(format!(
				"Error accessing file in series zip: {e}"
			))
		})?;

		// Skip directories
		if zip_file.is_dir() {
			continue;
		}

		// Using `enclosed_name` also validates against path traversal attacks:
		// https://docs.rs/zip/1.1.3/zip/read/struct.ZipFile.html#method.enclosed_name
		let Some(enclosed_path) = zip_file.enclosed_name() else {
			return Err(APIError::InternalServerError(
				"Series zip contained a malformed path".to_string(),
			));
		};
		// Get the path that the archive file will be extracted to
		let extraction_path = series_path.join(enclosed_path);

		// Error if the file already exists and we aren't allowing overwrites
		if extraction_path.exists() && !allow_overwrite {
			return Err(APIError::InternalServerError(format!(
				"Unable to extract zip contents to {extraction_path:?}, overwrites are disabled"
			)));
		}

		validate_zip_file(&mut zip_file)?;
	}

	Ok(())
}

/// Validate a file within a series upload archive. This function checks the file against
/// allowed file types based on extension as well as magic byte inference. If either check
/// fails then an error is returned.
fn validate_zip_file(zip_file: &mut ZipFile) -> APIResult<()> {
	/// Any file extension not in this list will trigger an error
	const ALLOWED_EXTENSIONS: &[&str] = &[
		"cbr", "cbz", "epub", "pdf", "xml", "json", "png", "jpg", "jpeg", "webp", "gif",
		"heif", "jxl", "avif",
	];

	/// Any inferred mime type not in this list will trigger an error
	const ALLOWED_TYPES: &[&str] = &[
		"application/zip",
		"application/vnd.comicbook+zip",
		"application/vnd.comicbook-rar",
		"application/epub+zip",
		"application/pdf",
		"application/xml",
		"application/json",
		"image/png",
		"image/jpeg",
		"image/webp",
		"image/gif",
		"image/heif",
		"image/jxl",
		"image/avif",
	];

	let Some(enclosed_path) = zip_file.enclosed_name() else {
		return Err(APIError::InternalServerError(
			"Series zip contained a malformed path".to_string(),
		));
	};

	let extension = enclosed_path
		.extension()
		.and_then(|ext| ext.to_str())
		.map(str::to_ascii_lowercase)
		.ok_or_else(|| {
			APIError::BadRequest(format!(
				"Expected zip contents {enclosed_path:?} to have an extension."
			))
		})?;

	if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
		return Err(APIError::BadRequest(format!(
			"Zip contents {enclosed_path:?} has a disallowed extension, permitted extensions are: {ALLOWED_EXTENSIONS:?}"
		)));
	}

	// Read first five bytes from which to infer content type
	let mut magic_bytes = [0u8; 5];
	zip_file.read_exact(&mut magic_bytes).map_err(|_| {
		APIError::InternalServerError(
			"Failed to read first five bytes of zip file.".to_string(),
		)
	})?;

	let inferred_type = infer::get(&magic_bytes)
		.ok_or(APIError::InternalServerError(format!(
			"Unable to infer type for zip contents {enclosed_path:?}"
		)))?
		.mime_type();

	if !ALLOWED_TYPES.contains(&inferred_type) {
		return Err(APIError::InternalServerError(format!(
			"Zip contents {enclosed_path:?} has a disallowed mime type: {inferred_type}, permitted types are: {ALLOWED_TYPES:?}"
		)));
	}

	Ok(())
}

/// Returns `true` if a parameter specifying a path from another path contains no parent directory components.
///
/// Upload paths for books are received as a path offset, where the actual path is constructed as
/// `{library_path}/{offset}`. This could be a security vulnerability if someone sent an upload with
/// a path containing a `..` to push the path back to the parent directory. This could be used to escape
/// the library and upload things elsewhere. It also means that accepting only paths that start with the
/// library path isn't sufficient.
///
/// This function will reject any paths that include a parent directory component. There is unlikely to be
/// any circumstance where a client sending one would be appropriate anyhow.
fn is_subpath_secure(params: &str) -> bool {
	let path = path::Path::new(params);

	for component in path.components() {
		if component == std::path::Component::ParentDir {
			return false;
		}
	}

	true
}

/// Helper function to get prisma libraries by ID, respecting user filters and returning
/// only the path and options data.
async fn get_library(
	client: &Arc<PrismaClient>,
	library_id: &str,
	user: &User,
) -> APIResult<LibraryData> {
	client
		.library()
		.find_first(vec![
			library::id::equals(library_id.to_string()),
			library_not_hidden_from_user_filter(user),
		])
		.select(library_path_with_options_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))
}

/// A helper function to generate the path at which books should be placed
/// given an input [`UploadBooksRequest`] and library.
fn get_books_path(
	books_request: &UploadBooksRequest,
	library: &LibraryData,
) -> APIResult<PathBuf> {
	// Validate the placement path parameters, error otherwise
	// This is an important security check.
	if !is_subpath_secure(&books_request.place_at) {
		return Err(APIError::BadRequest(
			"Invalid upload path placement parameters".to_string(),
		));
	}
	// Get path that uploads will be placed at, account for possible full path
	let placement_path = if books_request.place_at.starts_with(&library.path) {
		path::PathBuf::from(&books_request.place_at)
	} else {
		path::Path::new(&library.path).join(&books_request.place_at)
	};

	Ok(placement_path)
}

/// A helper function to generate the path at which a series zip should be placed
/// given an input [`UploadSeriesRequest`] and library.
fn get_series_path(
	series_request: &UploadSeriesRequest,
	library: &LibraryData,
) -> APIResult<PathBuf> {
	if !is_subpath_secure(&series_request.place_at) {
		return Err(APIError::BadRequest(
			"Invalid upload path placement parameters".to_string(),
		));
	}
	// Validate the series directory name - the same traversal concerns apply here
	if !is_subpath_secure(&series_request.series_dir_name) {
		return Err(APIError::BadRequest(
			"Invalid series directory name".to_string(),
		));
	}

	// Get path that the series upload will be placed at, accounting for possible full path
	let placement_path = if series_request.place_at.starts_with(&library.path) {
		path::PathBuf::from(&series_request.place_at)
			.join(&series_request.series_dir_name)
	} else {
		path::Path::new(&library.path)
			.join(&series_request.place_at)
			.join(&series_request.series_dir_name)
	};

	Ok(placement_path)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_is_subpath_secure() {
		let secure_subpath = "series/name/secure";
		assert!(is_subpath_secure(secure_subpath));

		let insecure_subpath = "series/../../../../dastardly";
		assert!(!is_subpath_secure(insecure_subpath));
	}
}
