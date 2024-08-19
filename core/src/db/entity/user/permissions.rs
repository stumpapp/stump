use itertools::Itertools;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fmt;
use utoipa::ToSchema;

use crate::prisma;

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct AgeRestriction {
	pub age: i32,
	pub restrict_on_unset: bool,
}

impl From<prisma::age_restriction::Data> for AgeRestriction {
	fn from(data: prisma::age_restriction::Data) -> AgeRestriction {
		AgeRestriction {
			age: data.age,
			restrict_on_unset: data.restrict_on_unset,
		}
	}
}

// TODO: consider separating some of the `manage` permissions into more granular permissions
// TODO: consider adding self:update permission, useful for child accounts
/// Permissions that can be granted to a user. Some permissions are implied by others,
/// and will be automatically granted if the "parent" permission is granted.
#[derive(
	Debug, Clone, Copy, Serialize, Deserialize, Type, ToSchema, Eq, PartialEq, Hash,
)]
pub enum UserPermission {
	///TODO: Expand permissions for bookclub + smartlist
	/// Grant access to the book club feature
	#[serde(rename = "bookclub:read")]
	AccessBookClub,
	/// Grant access to create a book club (access book club)
	#[serde(rename = "bookclub:create")]
	CreateBookClub,
	/// Grant access to read any emailers in the system
	#[serde(rename = "emailer:read")]
	EmailerRead,
	/// Grant access to create an emailer
	#[serde(rename = "emailer:create")]
	EmailerCreate,
	/// Grant access to manage an emailer
	#[serde(rename = "emailer:manage")]
	EmailerManage,
	/// Grant access to send an email
	#[serde(rename = "email:send")]
	EmailSend,
	/// Grant access to send an arbitrary email, bypassing any registered device requirements
	#[serde(rename = "email:arbitrary_send")]
	EmailArbitrarySend,
	/// Grant access to access the smart list feature. This includes the ability to create and edit smart lists
	#[serde(rename = "smartlist:read")]
	AccessSmartList,
	/// Grant access to access the file explorer
	#[serde(rename = "file:explorer")]
	FileExplorer,
	/// Grant access to upload files to a library
	#[serde(rename = "file:upload")]
	UploadFile,
	/// Grant access to download files from a library
	#[serde(rename = "file:download")]
	DownloadFile,
	/// Grant access to create a library
	#[serde(rename = "library:create")]
	CreateLibrary,
	/// Grant access to edit basic details about the library
	#[serde(rename = "library:edit")]
	EditLibrary,
	/// Grant access to scan the library for new files
	#[serde(rename = "library:scan")]
	ScanLibrary,
	/// Grant access to manage the library (scan,edit,manage relations)
	#[serde(rename = "library:manage")]
	ManageLibrary,
	/// Grant access to delete the library (manage library)
	#[serde(rename = "library:delete")]
	DeleteLibrary,
	/// Grant access to read users.
	///
	/// Note that this is explicitly for querying users via user-specific endpoints.
	/// This would not affect relational queries, such as members in a common book club.
	#[serde(rename = "user:read")]
	ReadUsers,
	/// Grant access to manage users (create,edit,delete)
	#[serde(rename = "user:manage")]
	ManageUsers,
	#[serde(rename = "notifier:read")]
	ReadNotifier,
	/// Grant access to create a notifier
	#[serde(rename = "notifier:create")]
	CreateNotifier,
	/// Grant access to manage a notifier
	#[serde(rename = "notifier:manage")]
	ManageNotifier,
	/// Grant access to delete a notifier
	#[serde(rename = "notifier:delete")]
	DeleteNotifier,
	/// Grant access to manage the server. This is effectively a step below server owner
	#[serde(rename = "server:manage")]
	ManageServer,
}

impl UserPermission {
	/// Return a list of permissions, if any, which are inherited by self
	///
	/// For example, UserPermission::CreateNotifier implies UserPermission::ReadNotifier
	// TODO: revisit these. I am mixing patterns, e.g. manage vs explicit edit+create+delete. Pick one!
	pub fn associated(&self) -> Vec<UserPermission> {
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
				UserPermission::DeleteLibrary,
				UserPermission::EditLibrary,
				UserPermission::ManageLibrary,
			],
			UserPermission::DeleteLibrary => {
				vec![UserPermission::ManageLibrary, UserPermission::ScanLibrary]
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
			UserPermission::ManageUsers => vec![UserPermission::ReadUsers],
			_ => vec![],
		}
	}
}

impl fmt::Display for UserPermission {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			UserPermission::AccessBookClub => write!(f, "bookclub:read"),
			UserPermission::CreateBookClub => write!(f, "bookclub:create"),
			UserPermission::EmailerRead => write!(f, "emailer:read"),
			UserPermission::EmailerCreate => write!(f, "emailer:create"),
			UserPermission::EmailerManage => write!(f, "emailer:manage"),
			UserPermission::EmailSend => write!(f, "email:send"),
			UserPermission::EmailArbitrarySend => write!(f, "email:arbitrary_send"),
			UserPermission::AccessSmartList => write!(f, "smartlist:read"),
			UserPermission::FileExplorer => write!(f, "file:explorer"),
			UserPermission::UploadFile => write!(f, "file:upload"),
			UserPermission::DownloadFile => write!(f, "file:download"),
			UserPermission::CreateLibrary => write!(f, "library:create"),
			UserPermission::EditLibrary => write!(f, "library:edit"),
			UserPermission::ScanLibrary => write!(f, "library:scan"),
			UserPermission::ManageLibrary => write!(f, "library:manage"),
			UserPermission::DeleteLibrary => write!(f, "library:delete"),
			UserPermission::ReadUsers => write!(f, "user:read"),
			UserPermission::ManageUsers => write!(f, "user:manage"),
			UserPermission::ReadNotifier => write!(f, "notifier:read"),
			UserPermission::CreateNotifier => write!(f, "notifier:create"),
			UserPermission::ManageNotifier => write!(f, "notifier:manage"),
			UserPermission::DeleteNotifier => write!(f, "notifier:delete"),
			UserPermission::ManageServer => write!(f, "server:manage"),
		}
	}
}

// TODO: refactor to remove panic :grimace:
impl From<&str> for UserPermission {
	fn from(s: &str) -> UserPermission {
		match s {
			"bookclub:read" => UserPermission::AccessBookClub,
			"bookclub:create" => UserPermission::CreateBookClub,
			"emailer:read" => UserPermission::EmailerRead,
			"emailer:create" => UserPermission::EmailerCreate,
			"emailer:manage" => UserPermission::EmailerManage,
			"email:send" => UserPermission::EmailSend,
			"email:arbitrary_send" => UserPermission::EmailArbitrarySend,
			"smartlist:read" => UserPermission::AccessSmartList,
			"file:explorer" => UserPermission::FileExplorer,
			"file:upload" => UserPermission::UploadFile,
			"file:download" => UserPermission::DownloadFile,
			"library:create" => UserPermission::CreateLibrary,
			"library:edit" => UserPermission::EditLibrary,
			"library:scan" => UserPermission::ScanLibrary,
			"library:manage" => UserPermission::ManageLibrary,
			"library:delete" => UserPermission::DeleteLibrary,
			"user:read" => UserPermission::ReadUsers,
			"user:manage" => UserPermission::ManageUsers,
			"notifier:read" => UserPermission::ReadNotifier,
			"notifier:create" => UserPermission::CreateNotifier,
			"notifier:manage" => UserPermission::ManageNotifier,
			"notifier:delete" => UserPermission::DeleteNotifier,
			"server:manage" => UserPermission::ManageServer,
			// FIXME: Don't panic smh
			_ => panic!("Invalid user permission: {}", s),
		}
	}
}

/// A wrapper around a Vec<UserPermission> used for including any associated permissions
/// from the underlying permissions
#[derive(Debug, Serialize, Deserialize, ToSchema, Type)]
pub struct PermissionSet(Vec<UserPermission>);

impl PermissionSet {
	/// Unwrap the underlying Vec<UserPermission> and include any associated permissions
	pub fn resolve_into_vec(self) -> Vec<UserPermission> {
		self.0
			.into_iter()
			.flat_map(|permission| {
				let mut v = vec![permission];
				v.extend(permission.associated());
				v
			})
			.unique()
			.collect()
	}
}

impl From<String> for PermissionSet {
	fn from(s: String) -> PermissionSet {
		if s.is_empty() {
			return PermissionSet(vec![]);
		}
		let permissions = s
			.split(',')
			.map(|s| s.trim())
			.filter(|s| !s.is_empty())
			.map(UserPermission::from)
			.collect();
		PermissionSet(permissions)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_permission_associated() {
		assert_eq!(
			UserPermission::CreateBookClub.associated(),
			vec![UserPermission::AccessBookClub]
		);
		assert_eq!(
			UserPermission::EmailerRead.associated(),
			vec![UserPermission::EmailSend]
		);
		assert_eq!(
			UserPermission::EmailerCreate.associated(),
			vec![UserPermission::EmailerRead]
		);
		assert_eq!(
			UserPermission::EmailerManage.associated(),
			vec![UserPermission::EmailerCreate, UserPermission::EmailerRead]
		);
		assert_eq!(
			UserPermission::EmailArbitrarySend.associated(),
			vec![UserPermission::EmailSend]
		);
		assert_eq!(
			UserPermission::CreateLibrary.associated(),
			vec![UserPermission::EditLibrary, UserPermission::ScanLibrary]
		);
		assert_eq!(
			UserPermission::ManageLibrary.associated(),
			vec![
				UserPermission::ScanLibrary,
				UserPermission::DeleteLibrary,
				UserPermission::EditLibrary,
				UserPermission::ManageLibrary
			]
		);
		assert_eq!(
			UserPermission::DeleteLibrary.associated(),
			vec![UserPermission::ManageLibrary, UserPermission::ScanLibrary]
		);
		assert_eq!(
			UserPermission::CreateNotifier.associated(),
			vec![UserPermission::ReadNotifier]
		);
		assert_eq!(
			UserPermission::ManageNotifier.associated(),
			vec![
				UserPermission::DeleteNotifier,
				UserPermission::ReadNotifier,
				UserPermission::CreateNotifier
			]
		);
		assert_eq!(
			UserPermission::DeleteNotifier.associated(),
			vec![UserPermission::ManageNotifier, UserPermission::ReadNotifier]
		);
		assert_eq!(
			UserPermission::ManageUsers.associated(),
			vec![UserPermission::ReadUsers]
		);
		assert_eq!(UserPermission::AccessBookClub.associated(), vec![]);
	}

	#[test]
	fn test_permission_from_str() {
		assert_eq!(
			UserPermission::from("bookclub:read"),
			UserPermission::AccessBookClub
		);
		assert_eq!(
			UserPermission::from("bookclub:create"),
			UserPermission::CreateBookClub
		);
		assert_eq!(
			UserPermission::from("emailer:read"),
			UserPermission::EmailerRead
		);
		assert_eq!(
			UserPermission::from("emailer:create"),
			UserPermission::EmailerCreate
		);
		assert_eq!(
			UserPermission::from("emailer:manage"),
			UserPermission::EmailerManage
		);
		assert_eq!(
			UserPermission::from("email:send"),
			UserPermission::EmailSend
		);
		assert_eq!(
			UserPermission::from("email:arbitrary_send"),
			UserPermission::EmailArbitrarySend
		);
		assert_eq!(
			UserPermission::from("smartlist:read"),
			UserPermission::AccessSmartList
		);
		assert_eq!(
			UserPermission::from("file:explorer"),
			UserPermission::FileExplorer
		);
		assert_eq!(
			UserPermission::from("file:upload"),
			UserPermission::UploadFile
		);
		assert_eq!(
			UserPermission::from("file:download"),
			UserPermission::DownloadFile
		);
		assert_eq!(
			UserPermission::from("library:create"),
			UserPermission::CreateLibrary
		);
		assert_eq!(
			UserPermission::from("library:edit"),
			UserPermission::EditLibrary
		);
		assert_eq!(
			UserPermission::from("library:scan"),
			UserPermission::ScanLibrary
		);
		assert_eq!(
			UserPermission::from("library:manage"),
			UserPermission::ManageLibrary
		);
		assert_eq!(
			UserPermission::from("library:delete"),
			UserPermission::DeleteLibrary
		);
		assert_eq!(UserPermission::from("user:read"), UserPermission::ReadUsers);
		assert_eq!(
			UserPermission::from("user:manage"),
			UserPermission::ManageUsers
		);
		assert_eq!(
			UserPermission::from("notifier:read"),
			UserPermission::ReadNotifier
		);
		assert_eq!(
			UserPermission::from("notifier:create"),
			UserPermission::CreateNotifier
		);
		assert_eq!(
			UserPermission::from("notifier:manage"),
			UserPermission::ManageNotifier
		);
		assert_eq!(
			UserPermission::from("notifier:delete"),
			UserPermission::DeleteNotifier
		);
		assert_eq!(
			UserPermission::from("server:manage"),
			UserPermission::ManageServer
		);
	}

	#[test]
	fn test_permission_set_from_string() {
		let permission_set =
			PermissionSet::from("bookclub:read,bookclub:create".to_string());
		assert_eq!(
			permission_set.resolve_into_vec(),
			vec![
				UserPermission::AccessBookClub,
				UserPermission::CreateBookClub
			]
		);
	}

	#[test]
	fn test_permission_set_from_string_with_associated() {
		let permission_set_vec =
			PermissionSet::from("bookclub:create".to_string()).resolve_into_vec();
		assert_eq!(permission_set_vec.len(), 2);
		assert!(permission_set_vec.contains(&UserPermission::AccessBookClub));
		assert!(permission_set_vec.contains(&UserPermission::CreateBookClub));
	}

	#[test]
	fn test_permission_set_from_empty_string() {
		let permission_set = PermissionSet::from("".to_string());
		assert_eq!(permission_set.resolve_into_vec().len(), 0);
	}

	#[test]
	fn test_permission_set_from_space_string() {
		let permission_set = PermissionSet::from("        ".to_string());
		assert_eq!(permission_set.resolve_into_vec().len(), 0);
	}

	#[test]
	fn test_permission_set_with_nth_empty_string() {
		let permission_set = PermissionSet::from("bookclub:read,".to_string());
		assert_eq!(
			permission_set.resolve_into_vec(),
			vec![UserPermission::AccessBookClub]
		);
	}

	#[test]
	fn test_permission_set_with_nth_space_string() {
		let permission_set =
			PermissionSet::from("bookclub:read,  ,      ,     ,".to_string());
		assert_eq!(
			permission_set.resolve_into_vec(),
			vec![UserPermission::AccessBookClub]
		);
	}
}
