use itertools::Itertools;
use std::fmt;

use sea_orm::{entity::prelude::*, FromQueryResult};
use serde::{Deserialize, Serialize};

use super::age_restriction;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "users")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	#[sea_orm(column_type = "Text", unique)]
	pub username: String,
	#[sea_orm(column_type = "Text")]
	pub hashed_password: String,
	pub is_server_owner: bool,
	#[sea_orm(column_type = "Text", nullable)]
	pub avatar_url: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub last_login: Option<String>,
	#[sea_orm(column_type = "custom(\"DATETIME\")")]
	pub created_at: String,
	#[sea_orm(column_type = "custom(\"DATETIME\")", nullable)]
	pub deleted_at: Option<String>,
	pub is_locked: bool,
	pub max_sessions_allowed: Option<i32>,
	#[sea_orm(column_type = "Text", nullable)]
	pub permissions: Option<String>,
	#[sea_orm(column_type = "Text", nullable, unique)]
	pub user_preferences_id: Option<String>,
}

#[derive(Clone)]
pub struct AuthUser {
	pub id: String,
	pub username: String,
	pub is_server_owner: bool,
	pub permissions: Vec<UserPermission>,
	pub age_restriction: Option<super::age_restriction::Model>,
}

impl FromQueryResult for AuthUser {
	fn from_query_result(
		res: &sea_orm::QueryResult,
		_pre: &str,
	) -> Result<Self, sea_orm::DbErr> {
		let id = res.try_get("", "id")?;
		let username = res.try_get("", "username")?;
		let is_server_owner = res.try_get("", "is_server_owner")?;
		let permissions_str: String = res.try_get("", "permissions")?;
		let permissions = PermissionSet::from(permissions_str).resolve_into_vec();
		let age_restriction = match age_restriction::Model::from_query_result(res, "") {
			Ok(age_restriction) => Some(age_restriction),
			Err(sea_orm::DbErr::RecordNotFound(_)) => None,
			Err(err) => return Err(err),
		};

		Ok(AuthUser {
			id,
			username,
			is_server_owner,
			permissions,
			age_restriction,
		})
	}
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq, Hash)]
pub enum UserPermission {
	/// Grant access to read/create their own API keys
	#[serde(rename = "feature:api_keys")]
	AccessAPIKeys,
	/// Grant access to the koreader sync feature
	#[serde(rename = "feature:koreader_sync")]
	AccessKoreaderSync,
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
	/// For example, [`UserPermission::CreateNotifier`] implies [`UserPermission::ReadNotifier`]
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
			UserPermission::AccessAPIKeys => write!(f, "feature:api_keys"),
			UserPermission::AccessKoreaderSync => write!(f, "feature:koreader_sync"),
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
			"feature:api_keys" => UserPermission::AccessAPIKeys,
			"feature:koreader_sync" => UserPermission::AccessKoreaderSync,
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
			_ => panic!("Invalid user permission: {s}"),
		}
	}
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
			.map(UserPermission::from)
			.collect();
		PermissionSet(permissions)
	}
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::age_restriction::Entity")]
	AgeRestriction,
	#[sea_orm(has_many = "super::api_key::Entity")]
	ApiKey,
	#[sea_orm(has_many = "super::book_club_invitation::Entity")]
	BookClubInvitation,
	#[sea_orm(has_many = "super::book_club_member::Entity")]
	BookClubMember,
	#[sea_orm(has_many = "super::bookmark::Entity")]
	Bookmark,
	#[sea_orm(has_many = "super::emailer_send_record::Entity")]
	EmailerSendRecord,
	#[sea_orm(has_many = "super::finished_reading_session::Entity")]
	FinishedReadingSession,
	#[sea_orm(has_many = "super::library_hidden_to_user::Entity")]
	HiddenLibrary,
	#[sea_orm(has_many = "super::last_library_visit::Entity")]
	LastLibraryVisit,
	#[sea_orm(has_many = "super::media_annotation::Entity")]
	MediaAnnotation,
	#[sea_orm(has_many = "super::reading_list::Entity")]
	ReadingList,
	#[sea_orm(has_many = "super::reading_session::Entity")]
	ReadingSession,
	#[sea_orm(has_many = "super::review::Entity")]
	Review,
	#[sea_orm(has_many = "super::session::Entity")]
	Session,
	#[sea_orm(has_many = "super::smart_list_access_rule::Entity")]
	SmartListAccessRule,
	#[sea_orm(has_many = "super::smart_list::Entity")]
	SmartList,
	#[sea_orm(has_many = "super::user_login_activity::Entity")]
	UserLoginActivity,
	#[sea_orm(
		belongs_to = "super::user_preference::Entity",
		from = "Column::UserPreferencesId",
		to = "super::user_preference::Column::Id",
		on_update = "Cascade",
		on_delete = "Cascade"
	)]
	UserPreference,
}

impl Related<super::age_restriction::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::AgeRestriction.def()
	}
}

impl Related<super::api_key::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ApiKey.def()
	}
}

impl Related<super::book_club_invitation::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubInvitation.def()
	}
}

impl Related<super::book_club_member::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::BookClubMember.def()
	}
}

impl Related<super::bookmark::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Bookmark.def()
	}
}

impl Related<super::emailer_send_record::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::EmailerSendRecord.def()
	}
}

impl Related<super::finished_reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::FinishedReadingSession.def()
	}
}

impl Related<super::library_hidden_to_user::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::HiddenLibrary.def()
	}
}

impl Related<super::last_library_visit::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::LastLibraryVisit.def()
	}
}

impl Related<super::media_annotation::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::MediaAnnotation.def()
	}
}

impl Related<super::reading_list::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingList.def()
	}
}

impl Related<super::reading_session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::ReadingSession.def()
	}
}

impl Related<super::review::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Review.def()
	}
}

impl Related<super::session::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Session.def()
	}
}

impl Related<super::smart_list_access_rule::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartListAccessRule.def()
	}
}

impl Related<super::smart_list::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::SmartList.def()
	}
}

impl Related<super::user_login_activity::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::UserLoginActivity.def()
	}
}

impl Related<super::user_preference::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::UserPreference.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}
