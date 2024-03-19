use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::{Cursor, ReadProgress},
	prisma,
};

use super::{AgeRestriction, LoginActivity, UserPermission, UserPreferences};

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
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
	pub max_sessions_allowed: Option<i32>,

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
			max_sessions_allowed: data.max_sessions_allowed,
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
