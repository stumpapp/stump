use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;

use super::{Cursor, ReadProgress};

///////////////////////////////////////////////
//////////////////// MODELS ///////////////////
///////////////////////////////////////////////

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct AgeRestriction {
	pub age: i32,
	pub restrict_on_unset: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct User {
	pub id: String,
	pub username: String,
	pub is_server_owner: bool,
	pub avatar_url: Option<String>,
	pub created_at: String,
	pub last_login: Option<String>,
	pub is_locked: bool,

	pub permissions: Vec<UserPermission>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub login_sessions_count: Option<i32>,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user_preferences: Option<UserPreferences>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub login_activity: Option<Vec<LoginActivity>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub age_restriction: Option<AgeRestriction>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub read_progresses: Option<Vec<ReadProgress>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct LoginActivity {
	pub id: String,
	pub ip_address: String,
	pub user_agent: String,
	pub authentication_successful: bool,
	pub timestamp: String,

	#[serde(skip_serializing_if = "Option::is_none")]
	pub user: Option<User>,
}

impl User {
	pub fn has_permission(&self, permission: UserPermission) -> bool {
		self.is_server_owner || self.permissions.contains(&permission)
	}
}

impl Cursor for User {
	fn cursor(&self) -> String {
		self.id.clone()
	}
}

impl From<prisma::age_restriction::Data> for AgeRestriction {
	fn from(data: prisma::age_restriction::Data) -> AgeRestriction {
		AgeRestriction {
			age: data.age,
			restrict_on_unset: data.restrict_on_unset,
		}
	}
}

impl From<prisma::user::Data> for User {
	fn from(data: prisma::user::Data) -> User {
		let user_preferences = data
			.user_preferences()
			.map(|up| up.cloned().map(UserPreferences::from))
			.ok()
			.flatten();
		let read_progresses = data
			.read_progresses()
			.map(|rps| rps.iter().cloned().map(ReadProgress::from).collect())
			.ok();
		let age_restriction = data
			.age_restriction()
			.map(|ar| ar.cloned().map(AgeRestriction::from))
			.ok()
			.flatten();
		let login_activity = data
			.login_activity()
			.map(|la| la.clone().into_iter().map(LoginActivity::from).collect())
			.ok();
		let login_sessions_count =
			data.sessions().map(|sessions| sessions.len() as i32).ok();

		User {
			id: data.id,
			username: data.username,
			is_server_owner: data.is_server_owner,
			permissions: data
				.permissions
				.map(|p| {
					p.split(',')
						.map(|p| p.trim())
						.filter(|p| !p.is_empty())
						.map(|p| p.into())
						.collect()
				})
				.unwrap_or_default(),
			user_preferences,
			avatar_url: data.avatar_url,
			age_restriction,
			read_progresses,
			created_at: data.created_at.to_rfc3339(),
			last_login: data.last_login.map(|dt| dt.to_rfc3339()),
			login_activity,
			is_locked: data.is_locked,
			login_sessions_count,
		}
	}
}

// TODO: consider adding self:update permission, useful for child accounts
/// Permissions that can be granted to a user. Some permissions are implied by others,
/// and will be automatically granted if the "parent" permission is granted.
#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema, Eq, PartialEq)]
pub enum UserPermission {
	/// Grant access to the book club feature
	#[serde(rename = "bookclub:read")]
	AccessBookClub,
	/// Grant access to create a book club (access book club)
	#[serde(rename = "bookclub:create")]
	CreateBookClub,
	/// Grant access to access the file explorer
	#[serde(rename = "file:explorer")]
	FileExplorer,
	/// Grant access to upload files to the library (manage library)
	#[serde(rename = "file:upload")]
	UploadFile,
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
}

impl ToString for UserPermission {
	fn to_string(&self) -> String {
		match self {
			UserPermission::AccessBookClub => "bookclub:read".to_string(),
			UserPermission::CreateBookClub => "bookclub:create".to_string(),
			UserPermission::FileExplorer => "file:explorer".to_string(),
			UserPermission::UploadFile => "file:upload".to_string(),
			UserPermission::EditLibrary => "library:edit".to_string(),
			UserPermission::ScanLibrary => "library:scan".to_string(),
			UserPermission::ManageLibrary => "library:manage".to_string(),
			UserPermission::DeleteLibrary => "library:delete".to_string(),
		}
	}
}

impl From<&str> for UserPermission {
	fn from(s: &str) -> UserPermission {
		match s {
			"bookclub:read" => UserPermission::AccessBookClub,
			"bookclub:create" => UserPermission::CreateBookClub,
			"file:explorer" => UserPermission::FileExplorer,
			"file:upload" => UserPermission::UploadFile,
			"library:edit" => UserPermission::EditLibrary,
			"library:scan" => UserPermission::ScanLibrary,
			"library:manage" => UserPermission::ManageLibrary,
			"library:delete" => UserPermission::DeleteLibrary,
			_ => panic!("Invalid user permission: {}", s),
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct UserPreferences {
	pub id: String,
	pub locale: String,
	pub library_layout_mode: String,
	pub series_layout_mode: String,
	pub collection_layout_mode: String,
	pub app_theme: String,
	pub show_query_indicator: bool,
	#[serde(default)]
	pub enable_discord_presence: bool,
}

impl Default for UserPreferences {
	fn default() -> Self {
		Self {
			id: "DEFAULT".to_string(),
			locale: "en".to_string(),
			library_layout_mode: "GRID".to_string(),
			series_layout_mode: "GRID".to_string(),
			collection_layout_mode: "GRID".to_string(),
			app_theme: "LIGHT".to_string(),
			show_query_indicator: false,
			enable_discord_presence: false,
		}
	}
}

///////////////////////////////////////////////
////////////////// CONVERSIONS ////////////////
///////////////////////////////////////////////

impl From<prisma::user_preferences::Data> for UserPreferences {
	fn from(data: prisma::user_preferences::Data) -> UserPreferences {
		UserPreferences {
			id: data.id,
			locale: data.locale,
			library_layout_mode: data.library_layout_mode,
			series_layout_mode: data.series_layout_mode,
			collection_layout_mode: data.collection_layout_mode,
			app_theme: data.app_theme,
			show_query_indicator: data.show_query_indicator,
			enable_discord_presence: data.enable_discord_presence,
		}
	}
}

impl From<prisma::user_login_activity::Data> for LoginActivity {
	fn from(data: prisma::user_login_activity::Data) -> LoginActivity {
		let user = data.user().cloned().map(User::from).ok();
		LoginActivity {
			id: data.id,
			authentication_successful: data.authentication_successful,
			ip_address: data.ip_address,
			timestamp: data.timestamp.to_rfc3339(),
			user_agent: data.user_agent,
			user,
		}
	}
}
