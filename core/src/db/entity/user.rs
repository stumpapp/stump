use serde::{Deserialize, Serialize};
use specta::Type;
use std::fmt;
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
	pub role: String,
	pub avatar_url: Option<String>,
	pub created_at: String,
	pub last_login: Option<String>,
	pub is_locked: bool,

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
	pub fn is_admin(&self) -> bool {
		self.role == "SERVER_OWNER"
	}

	pub fn is_server_owner(&self) -> bool {
		self.role == "SERVER_OWNER"
	}

	pub fn is_member(&self) -> bool {
		self.role == "MEMBER"
	}

	// TODO: other utilities based off of preferences
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
			role: data.role,
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

#[derive(Serialize, Deserialize, Type, ToSchema, Default)]
pub enum UserRole {
	#[serde(rename = "SERVER_OWNER")]
	ServerOwner,
	#[serde(rename = "MEMBER")]
	#[default]
	Member,
}

impl From<UserRole> for String {
	fn from(role: UserRole) -> String {
		match role {
			UserRole::ServerOwner => "SERVER_OWNER".to_string(),
			UserRole::Member => "MEMBER".to_string(),
		}
	}
}

impl fmt::Display for UserRole {
	fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
		match self {
			UserRole::ServerOwner => write!(f, "SERVER_OWNER"),
			UserRole::Member => write!(f, "MEMBER"),
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

//////////////////////////////////////////////
//////////////////// INPUTS //////////////////
//////////////////////////////////////////////

#[derive(Deserialize, Type, ToSchema)]
pub struct DeleteUser {
	pub hard_delete: Option<bool>,
}

#[derive(Deserialize, Type, ToSchema)]
pub struct UpdateUser {
	pub username: String,
	pub password: Option<String>,
	pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Type, ToSchema)]
pub struct UpdateUserPreferences {
	pub id: String,
	pub locale: String,
	pub library_layout_mode: String,
	pub series_layout_mode: String,
	pub collection_layout_mode: String,
	pub app_theme: String,
	pub show_query_indicator: bool,
	pub enable_discord_presence: bool,
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
