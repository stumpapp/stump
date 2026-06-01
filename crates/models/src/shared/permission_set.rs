use std::str::FromStr;

use itertools::Itertools;
use serde::{Deserialize, Serialize};

use super::enums::UserPermission;

pub trait AssociatedPermission {
	fn associated(&self) -> Vec<UserPermission>;
}

/// A wrapper around a Vec<UserPermission> used for including any associated permissions
/// from the underlying permissions
#[derive(Debug, Serialize, Deserialize)]
pub struct PermissionSet(Vec<UserPermission>);

impl PermissionSet {
	pub fn new(permissions: Vec<UserPermission>) -> PermissionSet {
		PermissionSet(permissions)
	}

	/// Unwrap the underlying Vec<UserPermission> and include any associated permissions,
	/// recursively, so that callers see the transitive closure of granted permissions.
	pub fn resolve_into_vec(self) -> Vec<UserPermission> {
		let mut resolved: Vec<UserPermission> = Vec::new();
		let mut queue: Vec<UserPermission> = self.0;
		while let Some(permission) = queue.pop() {
			if !resolved.contains(&permission) {
				resolved.push(permission);
				queue.extend(permission.associated());
			}
		}
		resolved
	}

	pub fn resolve_into_string(self) -> Option<String> {
		let resolved = self.resolve_into_vec();
		if resolved.is_empty() {
			None
		} else {
			Some(resolved.into_iter().join(","))
		}
	}
}

impl From<String> for PermissionSet {
	fn from(s: String) -> PermissionSet {
		if s.is_empty() {
			return PermissionSet(vec![]);
		}
		let permissions = s
			.split(',')
			.map(str::trim)
			.filter(|s| !s.is_empty())
			.map(UserPermission::from_str)
			.filter_map(Result::ok)
			.collect();
		PermissionSet(permissions)
	}
}

impl AssociatedPermission for UserPermission {
	fn associated(&self) -> Vec<UserPermission> {
		match self {
			UserPermission::CreateBookClub => vec![UserPermission::AccessBookClub],
			UserPermission::EmailerRead => vec![UserPermission::EmailSend],
			UserPermission::EmailerCreate => vec![UserPermission::EmailerRead],
			UserPermission::EmailerManage => {
				vec![UserPermission::EmailerCreate, UserPermission::EmailerRead]
			},
			UserPermission::EmailArbitrarySend => vec![UserPermission::EmailSend],
			UserPermission::CreateLibrary => {
				vec![UserPermission::EditLibrary, UserPermission::ScanLibrary]
			},
			UserPermission::ManageLibrary => vec![
				UserPermission::ScanLibrary,
				UserPermission::EditLibrary,
				UserPermission::ManageLibrary,
				UserPermission::EditThumbnails,
			],
			UserPermission::DeleteLibrary => {
				vec![UserPermission::ManageLibrary]
			},
			UserPermission::CreateNotifier => vec![UserPermission::ReadNotifier],
			UserPermission::ManageNotifier => vec![
				UserPermission::DeleteNotifier,
				UserPermission::ReadNotifier,
				UserPermission::CreateNotifier,
			],
			UserPermission::DeleteNotifier => {
				vec![UserPermission::ManageNotifier, UserPermission::ReadNotifier]
			},
			UserPermission::CreateUser => vec![UserPermission::ReadUsers],
			UserPermission::LockUser => vec![UserPermission::ReadUsers],
			UserPermission::DeleteUser => {
				vec![UserPermission::UpdateUser, UserPermission::ReadUsers]
			},
			UserPermission::ManageUserSessions => vec![UserPermission::ReadUsers],
			UserPermission::ManageUsers => {
				vec![UserPermission::DeleteUser, UserPermission::CreateUser]
			},
			UserPermission::ReadPersistedLogs => {
				vec![UserPermission::ReadJobs]
			},
			UserPermission::WriteBackMetadata => vec![UserPermission::EditMetadata],
			UserPermission::EditThumbnails => vec![],
			UserPermission::ViewAllSmartLists => vec![],
			UserPermission::MetadataFetchRecordManage => {
				vec![UserPermission::MetadataFetchRecordRead]
			},
			UserPermission::MetadataProviderManage => {
				vec![UserPermission::MetadataProviderRead]
			},
			UserPermission::ManageBookClubs => vec![UserPermission::ModerateBookClubs],
			UserPermission::ManageServer => vec![
				UserPermission::AccessGraphQLPlayground,
				UserPermission::CreateBookClub,
				UserPermission::EmailerManage,
				UserPermission::CreateLibrary,
				UserPermission::ManageLibrary,
				UserPermission::CreateNotifier,
				UserPermission::ManageNotifier,
				UserPermission::CreateUser,
				UserPermission::LockUser,
				UserPermission::ManageUsers,
				UserPermission::ReadPersistedLogs,
				UserPermission::WriteBackMetadata,
				UserPermission::EditThumbnails,
				UserPermission::ViewAllSmartLists,
				UserPermission::AccessAPIKeys,
				UserPermission::ChangePassword,
				UserPermission::ChangeUsername,
				UserPermission::ChangeAvatar,
				UserPermission::EmailArbitrarySend,
				UserPermission::FileExplorer,
				UserPermission::UploadFile,
				UserPermission::DownloadFile,
				UserPermission::DeleteLibrary,
				UserPermission::ManageUserSessions,
				UserPermission::ManageJobs,
				UserPermission::MetadataFetchRecordManage,
				UserPermission::MetadataProviderManage,
				UserPermission::ReadSystemLogs,
				UserPermission::ManageBookClubs,
				// TODO(permissions): the following are per-user feature-access perms,
				// included so that admins retain parity with the legacy is_server_owner
				// short-circuit. Likely candidates for removal once admins are issued
				// a separate "default user perms" bundle alongside ManageServer.
				UserPermission::AccessKoreaderSync,
				UserPermission::AccessKoboSync,
				UserPermission::AccessSmartList,
			],
			_ => vec![],
		}
	}
}

/// Determine whether a set of granted permissions satisfies a target permission, either
/// directly or via association.
pub fn permissions_satisfy(granted: &[UserPermission], target: UserPermission) -> bool {
	granted
		.iter()
		.any(|p| p == &target || p.associated().contains(&target))
}

/// Determine whether a set of granted permissions satisfies every required permission.
pub fn permissions_satisfy_all(
	granted: &[UserPermission],
	required: &[UserPermission],
) -> bool {
	required
		.iter()
		.all(|target| permissions_satisfy(granted, *target))
}
