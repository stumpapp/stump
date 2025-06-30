use std::path::{Path, PathBuf};

use crate::guard::PermissionGuard;
use crate::input::filesystem::{DirectoryListingIgnoreParams, DirectoryListingInput};
use crate::object::directory_listing::{DirectoryListing, DirectoryListingFile};
use crate::pagination::{
	OffsetPagination, OffsetPaginationInfo, PaginatedResponse, Pagination, PaginationInfo,
};
use async_graphql::{Object, Result};
use itertools::Itertools;
use models::shared::enums::UserPermission;
use std::fs::DirEntry;
use stump_core::filesystem::PathUtils;

#[derive(Default)]
pub struct FilesystemQuery;

#[Object]
impl FilesystemQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::FileExplorer)")]
	async fn list_directory(
		&self,
		pagination: Pagination,
		input: Option<DirectoryListingInput>,
	) -> Result<PaginatedResponse<DirectoryListing>> {
		let params = input.unwrap_or_default();
		let list_root = params.path.clone().map(PathBuf::from);

		let pagination = match pagination {
			Pagination::Offset(p) => p,
			_ => return Err("Pagination must be offset".into()),
		};

		let start_path = match list_root {
			Some(path) => path,
			#[cfg(unix)]
			None => Path::new("/").into(),
			#[cfg(windows)]
			None => return windows_fs::get_drive_listing(pagination),
		};

		if !start_path.exists() {
			tracing::error!(?start_path, "Directory does not exist");
			return Err(
				format!("Directory does not exist: {}", start_path.display()).into(),
			);
		} else if !start_path.is_absolute() {
			return Err("Provided path must be absolute".into());
		}

		let files = read_and_filter_directory(&start_path, params.ignore_params)?
			.into_iter()
			.sorted_by(|a, b| {
				alphanumeric_sort::compare_path(
					a.name.to_lowercase(),
					b.name.to_lowercase(),
				)
			})
			.collect::<Vec<_>>();

		tracing::trace!(
			"{} files in directory listing for: {}",
			files.len(),
			start_path.display()
		);

		Ok(into_paginated_response(
			start_path.parent(),
			files,
			pagination,
		))
	}
}

fn into_paginated_response(
	parent: Option<&Path>,
	files: Vec<DirectoryListingFile>,
	pagination: OffsetPagination,
) -> PaginatedResponse<DirectoryListing> {
	let offset_info = OffsetPaginationInfo::new(pagination, files.len() as u64);

	let mut truncated_files = files;

	let start = (offset_info.current_page - 1) * offset_info.page_size;
	let end = start + offset_info.page_size;

	if start > truncated_files.len() as u64 {
		truncated_files.clear();
	} else if end < truncated_files.len() as u64 {
		truncated_files = truncated_files
			.get((start as usize)..(end as usize))
			.unwrap_or_default()
			.to_vec();
	} else {
		truncated_files = truncated_files
			.get((start as usize)..)
			.unwrap_or_default()
			.to_vec();
	}

	PaginatedResponse {
		nodes: vec![DirectoryListing {
			parent: parent.map(|p| p.to_string_lossy().to_string()),
			files: truncated_files,
		}],
		page_info: PaginationInfo::Offset(offset_info),
	}
}

fn read_and_filter_directory(
	start_path: &Path,
	ignore_params: DirectoryListingIgnoreParams,
) -> Result<Vec<DirectoryListingFile>> {
	let listing = std::fs::read_dir(start_path)?;

	let files = listing
		.filter_map(Result::ok)
		.filter_map(|entry| filter_from_params(entry, &ignore_params))
		.map(|entry| DirectoryListingFile::from(entry.path()))
		.collect();

	Ok(files)
}

fn filter_from_params(
	entry: DirEntry,
	params: &DirectoryListingIgnoreParams,
) -> Option<DirEntry> {
	let path = entry.path();

	if params.ignore_files && path.is_file() {
		return None;
	}

	if params.ignore_directories && path.is_dir() {
		return None;
	}

	if params.ignore_hidden && path.is_hidden_file() {
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
		pagination: OffsetPagination,
	) -> Result<PaginatedResponse<DirectoryListing>> {
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
					path: drive_letter,
				}
			})
			.collect::<Vec<_>>();

		Ok(into_paginated_response(None, drive_listing, pagination))
	}
}
