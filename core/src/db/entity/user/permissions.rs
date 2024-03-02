use itertools::Itertools;
use serde::{Deserialize, Serialize};
use specta::Type;
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
	// TODO: ReadUsers, CreateUsers, ManageUsers
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

impl ToString for UserPermission {
	fn to_string(&self) -> String {
		match self {
			UserPermission::AccessBookClub => "bookclub:read".to_string(),
			UserPermission::CreateBookClub => "bookclub:create".to_string(),
			UserPermission::EmailerRead => "emailer:read".to_string(),
			UserPermission::EmailerCreate => "emailer:create".to_string(),
			UserPermission::EmailerManage => "emailer:manage".to_string(),
			UserPermission::EmailSend => "email:send".to_string(),
			UserPermission::EmailArbitrarySend => "email:arbitrary_send".to_string(),
			UserPermission::AccessSmartList => "smartlist:read".to_string(),
			UserPermission::FileExplorer => "file:explorer".to_string(),
			UserPermission::UploadFile => "file:upload".to_string(),
			UserPermission::DownloadFile => "file:download".to_string(),
			UserPermission::CreateLibrary => "library:create".to_string(),
			UserPermission::EditLibrary => "library:edit".to_string(),
			UserPermission::ScanLibrary => "library:scan".to_string(),
			UserPermission::ManageLibrary => "library:manage".to_string(),
			UserPermission::DeleteLibrary => "library:delete".to_string(),
			UserPermission::ReadUsers => "user:read".to_string(),
			UserPermission::ManageUsers => "user:manage".to_string(),
			UserPermission::ReadNotifier => "notifier:read".to_string(),
			UserPermission::CreateNotifier => "notifier:create".to_string(),
			UserPermission::ManageNotifier => "notifier:manage".to_string(),
			UserPermission::DeleteNotifier => "notifier:delete".to_string(),
			UserPermission::ManageServer => "server:manage".to_string(),
		}
	}
}

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
		let permissions = s
			.split(',')
			.map(|s| s.trim())
			.map(|s| UserPermission::from(s))
			.collect();
		PermissionSet(permissions)
	}
}
