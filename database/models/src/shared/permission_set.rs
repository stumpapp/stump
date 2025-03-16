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
