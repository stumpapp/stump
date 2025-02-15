use axum::{extract::Query, middleware, routing::post, Extension, Json, Router};
use itertools::Itertools;
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

/// List the contents of a directory on the file system at a given (optional) path. If no path
/// is provided, the file system root directory contents is returned.
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
pub async fn list_directory(
	pagination: Query<PageQuery>,
	Extension(req): Extension<RequestContext>,
	Json(input): Json<Option<DirectoryListingInput>>,
) -> APIResult<Json<Pageable<DirectoryListing>>> {
	req.enforce_permissions(&[UserPermission::FileExplorer])?;
	let list_root = input.unwrap_or_default().path.map(PathBuf::from);
	let start_path = match list_root {
		Some(path) => path,
		#[cfg(unix)]
		None => Path::new("/").into(),
		#[cfg(windows)]
		None => return windows_fs::get_drive_listing(pagination),
	};

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

	let files = read_and_filter_directory(&start_path)?
		.into_iter()
		.sorted_by(|a, b| {
			alphanumeric_sort::compare_path(a.name.to_lowercase(), b.name.to_lowercase())
		})
		.collect::<Vec<_>>();

	trace!(
		"{} files in directory listing for: {}",
		files.len(),
		start_path.display()
	);

	// Set defaults for paging
	let page = pagination.page.unwrap_or(1);
	let page_size = pagination.page_size.unwrap_or(100);

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

fn read_and_filter_directory(
	start_path: &Path,
) -> Result<Vec<DirectoryListingFile>, std::io::Error> {
	let listing = std::fs::read_dir(start_path)?;

	let files = listing
		.filter_map(Result::ok)
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

#[cfg(target_os = "windows")]
mod windows_fs {
	use super::*;

	use std::{ffi::OsString, os::windows::ffi::OsStringExt};

	use windows::{core::PCWSTR, Win32::Foundation::MAX_PATH};

	pub fn get_drive_listing(
		pagination: Query<PageQuery>,
	) -> Result<Json<Pageable<DirectoryListing>>, APIError> {
		// Microsoft provides an unsafe interface to get a list of logical drive letters
		// docs: https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getlogicaldrivestringsw
		let mut buffer: [u16; 256] = [0; 256];
		let len = unsafe {
			windows::Win32::Storage::FileSystem::GetLogicalDriveStringsW(Some(
				&mut buffer,
			))
		};

		// We check for a failed read
		if len == 0 {
			return Err(APIError::InternalServerError(
				"Failed to read Win32 list of logical drives".to_string(),
			));
		}

		// We can iterate over the buffer to fetch a list of drives with their info
		const MAX_VOL_NAME: usize = (MAX_PATH + 1) as usize;
		let mut volume_name_buffer: [u16; MAX_VOL_NAME] = [0; MAX_VOL_NAME];
		let drive_listing = buffer
			.split(|&c| c == 0)
			.filter(|s: &&[u16]| !s.is_empty())
			.map(|encoded_letter| {
				let drive_letter = OsString::from_wide(encoded_letter)
					.to_string_lossy()
					.to_string();

				// Now we get the names for each volume using the GetVolumeInformationW call
				// docs: https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumeinformationw
				let volume_name_res = unsafe {
					windows::Win32::Storage::FileSystem::GetVolumeInformationW(
						PCWSTR(encoded_letter.as_ptr()),
						Some(&mut volume_name_buffer),
						None,
						None,
						None,
						None,
					)
				};

				let volume_name = match volume_name_res {
					Ok(_) => {
						let termination_index = volume_name_buffer
							.iter()
							.position(|&c| c == 0)
							.unwrap_or(volume_name_buffer.len());
						let os_str =
							OsString::from_wide(&volume_name_buffer[..termination_index]);

						if os_str.is_empty() {
							None
						} else {
							Some(os_str.to_string_lossy().to_string())
						}
					},
					Err(_) => None,
				};

				let drive_text = match volume_name {
					Some(name) => format!("{drive_letter} ({name})"),
					None => drive_letter.clone(),
				};

				DirectoryListingFile {
					is_directory: true,
					name: drive_text,
					path: PathBuf::from(drive_letter),
				}
			})
			.collect::<Vec<_>>();

		// Set defaults for paging
		let page = pagination.page.unwrap_or(1);
		let page_size = pagination.page_size.unwrap_or(100);

		Ok(Json(Pageable::from((
			DirectoryListing {
				parent: None,
				files: drive_listing,
			},
			page,
			page_size,
		))))
	}
}
