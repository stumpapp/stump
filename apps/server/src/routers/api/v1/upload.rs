use std::{path, sync::Arc};

use axum::{
	body::Bytes,
	extract::{DefaultBodyLimit, Path, State},
	middleware,
	routing::post,
	Extension, Json, Router,
};
use axum_typed_multipart::{FieldData, TryFromField, TryFromMultipart, TypedMultipart};
use serde::{Deserialize, Serialize};
use specta::Type;
use stump_core::{
	db::entity::{macros::library_path_with_options_select, User, UserPermission},
	prisma::{library, PrismaClient},
};
use tempfile::NamedTempFile;
use tokio::fs;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::{auth_middleware, RequestContext},
	routers::api::filters::library_not_hidden_from_user_filter,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/upload",
			Router::new()
				.route("/libraries/:id/books", post(upload_books))
				.route("/libraries/:id/series", post(upload_series)),
		)
		.layer(DefaultBodyLimit::max(app_state.config.max_file_upload_size))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

#[derive(Debug, Deserialize, Serialize, Type, TryFromField)]
pub enum UploadStrategy {
	#[serde(rename = "books")]
	Books,
	#[serde(rename = "series")]
	Series,
}

// https://docs.rs/axum_typed_multipart/0.13.1/axum_typed_multipart/
#[derive(TryFromMultipart)]
struct UploadFileRequest {
	strategy: UploadStrategy,
	/// The path to place the files at. If not provided, the library path is used. If the
	/// path does not exist, or exists outside the library path, the request will fail.
	#[form_data(default)]
	place_at: Option<String>, // PathBuf
	files: Vec<FieldData<Bytes>>,
}

async fn testing_ground_upload(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Extension(req): Extension<RequestContext>,
	TypedMultipart(UploadFileRequest {
		strategy,
		place_at,
		files,
	}): TypedMultipart<UploadFileRequest>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;
	let client = &ctx.db;

	// The form data is going to be loosely constructed by the js:
	// const formData = new FormData();
	// formData.append("files", files); // files is a File[]
	// formData.append("strategy", strategy); // strategy is a string
	// formData.append("place_at", place_at); // place_at is a Option<PathBuf>

	let library = client
		.library()
		.find_first(vec![
			library::id::equals(id),
			library_not_hidden_from_user_filter(&user),
		])
		.select(library_path_with_options_select::select())
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))?;

	let resolved_place_at = place_at.unwrap_or_else(|| library.path.clone());

	// check the path exists
	if fs::metadata(&resolved_place_at).await.is_err() {
		return Err(APIError::BadRequest(String::from(
			"The path does not exist",
		)));
	} else if !resolved_place_at.starts_with(&library.path) {
		return Err(APIError::BadRequest(String::from(
			"The path is outside the library",
		)));
	}

	let place_at = path::PathBuf::from(resolved_place_at);

	// TODO: handle the files

	// Note: keeping this scrap in case the typed multipart doesn't work out
	// let mut strategy: Option<UploadStrategy> = None;
	// let mut place_at: Option<PathBuf> = None;
	// let mut upload_fields = Vec::new();

	// while let Some(field) = upload.next_field().await? {
	// 	let name = field.name().unwrap_or_default();

	// 	match field.content_type() {
	// 		Some(mime) if name == "strategy" && mime == "text/plain" => {
	// 			let bytes = field.bytes().await?;
	// 			let strategy_str = std::str::from_utf8(bytes.as_ref()).map_err(|_| {
	// 				APIError::BadRequest(String::from("Invalid strategy"))
	// 			})?;
	// 			strategy = match strategy_str {
	// 				"books" => Some(UploadStrategy::Books),
	// 				"series" => Some(UploadStrategy::Series),
	// 				_ => None,
	// 			};
	// 		},
	// 		Some(mime) if name == "place_at" && mime == "text/plain" => {
	// 			let bytes = field.bytes().await?;
	// 			let place_at_str = std::str::from_utf8(bytes.as_ref()).map_err(|_| {
	// 				APIError::BadRequest(String::from("Invalid place_at"))
	// 			})?;
	// 			place_at = Some(PathBuf::from(place_at_str));
	// 		},
	// 		_ => {
	// 			upload_fields.push(field);
	// 		},
	// 	}
	// }

	Ok(Json(()))
}

// ///////////////////////////////////////////////
// Alternative proposal for handling uploads below
// ///////////////////////////////////////////////

#[derive(TryFromMultipart)]
struct UploadBooksRequest {
	place_at: String,
	#[form_data(limit = "unlimited")]
	files: Vec<FieldData<NamedTempFile>>,
}

#[utoipa::path(
	post,
	path = "/api/v1/upload/libraries/:id/books",
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
	Extension(req): Extension<RequestContext>,
	TypedMultipart(books_request): TypedMultipart<UploadBooksRequest>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;

	let client = &ctx.db;
	let library = get_library(client, id, &user).await?;

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
		path::Path::new(&library.path).join(books_request.place_at)
	};

	// TODO(upload): async-ify this
	// Check that it is a directory and already exists
	if !placement_path.is_dir() {
		return Err(APIError::BadRequest(
			"Book uploads must be placed at an existing directory.".to_string(),
		));
	}

	// TODO - Evaluate if this is the best apporoach to uploads
	// This pattern, including the use of `NamedTempFile` from the tempfile crate, is taken from
	// the documentation for axum_typed_multipart. Is this the best approach here? Some testing
	// is needed to see how large uploads are handled.
	for f in books_request.files {
		let file_name = f.metadata.file_name.as_ref().ok_or(APIError::BadRequest(
			"Uploaded files must have filenames.".to_string(),
		))?;
		let target_path = placement_path.join(file_name);

		copy_tempfile_to_location(f, &target_path).await?;
	}

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
	path = "/api/v1/upload/libraries/:id/series",
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
	Extension(req): Extension<RequestContext>,
	TypedMultipart(series_request): TypedMultipart<UploadSeriesRequest>,
) -> APIResult<Json<()>> {
	let user = req.user_and_enforce_permissions(&[
		UserPermission::UploadFile,
		UserPermission::ManageLibrary,
	])?;

	// Validate the provided file, exit early on failure.
	validate_series_upload(&series_request)?;

	let client = &ctx.db;
	let library = get_library(client, id, &user).await?;

	// Validate the placement path parameters, error otherwise
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
			.join(series_request.place_at)
			.join(&series_request.series_dir_name)
	};

	// Create directory if necessary
	if !placement_path.exists() {
		tokio::fs::create_dir_all(&placement_path).await?;
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

	Ok(Json(()))
}

async fn copy_tempfile_to_location(
	field_data: FieldData<NamedTempFile>,
	target_path: &path::Path,
) -> APIResult<()> {
	// We want to prevent overwriting something that already exists
	if target_path.exists() {
		return Err(APIError::BadRequest(format!(
			"File already exists at {}",
			target_path.to_string_lossy()
		)));
	}

	// Open the target file
	let mut target_file = fs::File::create(target_path).await?;
	// Get a tokio::fs::File for the temporary file
	let mut temp_file = fs::File::from_std(field_data.contents.as_file().try_clone()?);

	// Copy the bytes to the target location
	tokio::io::copy(&mut temp_file, &mut target_file).await?;

	Ok(())
}

fn validate_series_upload(series_request: &UploadSeriesRequest) -> APIResult<()> {
	// Check extension
	if let Some(file_name) = &series_request.file.metadata.file_name {
		if !file_name.ends_with(".zip") {
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
	const PERMITTED_CONTENT_TYPES: &[&str] =
		&["application/zip", "application/x-zip-compressed"];

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

/// Returns `true` if a parameter specifying a path from another path contains no parent directory components.
///
/// Upload paths for books are recieved as a path offset, where the actual path is constructed as
/// `{library_path}/{offset}`. This could be a security vulnerability if someone sent an upload with
/// a path containing a `..` to push the path back to the parent directoy. This could be used to escape
/// the library and upload things elsewhere. It also means that accepting only paths that start with the
/// library path isn't sufficient.
///
/// This function will reject any paths that include a parent directory component. There is unlikely to be
/// any circumstance where a client sending one would be appropriate anyhow.
fn is_subpath_secure(params: &str) -> bool {
	let path = path::Path::new(params);

	for component in path.components() {
		if let std::path::Component::ParentDir = component {
			return false;
		}
	}

	true
}

/// Helper function to get prisma libraries by ID, respecting user filters.
async fn get_library(
	client: &Arc<PrismaClient>,
	library_id: String,
	user: &User,
) -> APIResult<library::Data> {
	client
		.library()
		.find_first(vec![
			library::id::equals(library_id),
			library_not_hidden_from_user_filter(user),
		])
		.exec()
		.await?
		.ok_or(APIError::NotFound(String::from("Library not found")))
}

#[cfg(test)]
mod tests {
	use crate::routers::api::v1::upload::is_subpath_secure;

	#[test]
	fn test_is_subpath_secure() {
		let secure_subpath = "series/name/secure";
		assert!(is_subpath_secure(secure_subpath));

		let insecure_subpath = "series/../../../../dastardly";
		assert!(!is_subpath_secure(insecure_subpath));
	}
}
