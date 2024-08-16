use prisma_client_rust::chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::{ActiveReadingSession, Cursor, FinishedReadingSession},
	prisma::user,
};

use super::{
	AgeRestriction, LoginActivity, PermissionSet, UserPermission, UserPreferences,
};

#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct User {
	/// The ID of the user
	pub id: String,
	/// The username of the user.
	///
	/// Note: This is a unique field.
	pub username: String,
	/// A boolean to indicate if the user is the server owner
	pub is_server_owner: bool,
	/// The URL of the user's avatar, if any
	pub avatar_url: Option<String>,
	/// A timestamp of when the user was created, in RFC3339 format
	pub created_at: DateTime<FixedOffset>,
	/// A timestamp of when the user last logged in, in RFC3339 format
	pub last_login: Option<DateTime<FixedOffset>>,
	/// A boolean to indicate if the user is locked, which prevents them from logging in
	pub is_locked: bool,
	/// The permissions of the user, influences what actions throughout the app they can perform
	pub permissions: Vec<UserPermission>,
	/// The maximum number of sessions the user is allowed to have at once
	#[serde(skip_serializing_if = "Option::is_none")]
	pub max_sessions_allowed: Option<i32>,
	/// The number of login sessions the user has. Will be `None` if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub login_sessions_count: Option<i32>,
	/// The user preferences of the user
	#[serde(skip_serializing_if = "Option::is_none")]
	pub user_preferences: Option<UserPreferences>,
	/// The login activity/history of the user. Will be `None` if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub login_activity: Option<Vec<LoginActivity>>,
	/// The age restriction spec for the user, which restricts the content they can access
	#[serde(skip_serializing_if = "Option::is_none")]
	pub age_restriction: Option<AgeRestriction>,
	/// The active reading sessions for the user. Will be `None` if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub active_reading_sessions: Option<Vec<ActiveReadingSession>>,
	/// The finished reading sessions for the user. Will be `None` if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub finished_reading_sessions: Option<Vec<FinishedReadingSession>>,
}

impl User {
	pub fn is(&self, other: &User) -> bool {
		self.id == other.id
	}

	pub fn has_permission(&self, permission: UserPermission) -> bool {
		self.is_server_owner || self.permissions.contains(&permission)
	}
}

impl Cursor for User {
	fn cursor(&self) -> String {
		self.id.clone()
	}
}

impl From<user::Data> for User {
	fn from(data: user::Data) -> User {
		let user_preferences = data
			.user_preferences()
			.map(|up| up.cloned().map(UserPreferences::from))
			.ok()
			.flatten();
		let active_reading_sessions = data
			.active_reading_sessions()
			.map(|ars| {
				ars.clone()
					.into_iter()
					.map(ActiveReadingSession::from)
					.collect()
			})
			.ok();
		let finished_reading_sessions = data
			.finished_reading_sessions()
			.map(|frs| {
				frs.clone()
					.into_iter()
					.map(FinishedReadingSession::from)
					.collect()
			})
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

		let permission_set = data.permissions.map(PermissionSet::from);

		User {
			id: data.id,
			username: data.username,
			is_server_owner: data.is_server_owner,
			permissions: permission_set
				.map(|ps| ps.resolve_into_vec())
				.unwrap_or_default(),
			max_sessions_allowed: data.max_sessions_allowed,
			user_preferences,
			avatar_url: data.avatar_url,
			age_restriction,
			active_reading_sessions,
			finished_reading_sessions,
			created_at: data.created_at,
			last_login: data.last_login,
			login_activity,
			is_locked: data.is_locked,
			login_sessions_count,
		}
	}
}
