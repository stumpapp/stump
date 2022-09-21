use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, Type)]
pub struct User {
	pub id: String,
	pub username: String,
	pub role: String,
	pub user_preferences: Option<UserPreferences>,
}

impl User {
	pub fn is_admin(&self) -> bool {
		self.role == "SERVER_OWNER"
	}

	pub fn is_member(&self) -> bool {
		self.role == "MEMBER"
	}

	// TODO: other utilities based off of preferences
}

impl Into<User> for prisma::user::Data {
	fn into(self) -> User {
		let user_preferences = match self.user_preferences() {
			Ok(up) => Some(up.unwrap().to_owned().into()),
			Err(e) => {
				log::trace!("Failed to load user preferences for user: {}", e);
				None
			},
		};

		User {
			id: self.id,
			username: self.username,
			role: self.role,
			user_preferences,
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, Type)]

pub struct UserPreferences {
	pub id: String,
	// pub reduce_animations: bool,
	pub locale: String,
	pub library_layout_mode: String,
	pub series_layout_mode: String,
	pub collection_layout_mode: String,
}

impl Into<UserPreferences> for prisma::user_preferences::Data {
	fn into(self) -> UserPreferences {
		UserPreferences {
			id: self.id.clone(),
			locale: self.locale,
			// reduce_animations: self.reduce_animations,
			library_layout_mode: self.library_layout_mode.clone(),
			series_layout_mode: self.series_layout_mode.clone(),
			collection_layout_mode: self.collection_layout_mode.clone(),
		}
	}
}

#[derive(Debug, Clone, Deserialize, JsonSchema, Type)]

pub struct UserPreferencesUpdate {
	pub locale: String,
	pub library_layout_mode: String,
	pub series_layout_mode: String,
	pub collection_layout_mode: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema, Type)]

pub struct AuthenticatedUser {
	pub id: String,
	pub username: String,
	pub role: String,
	pub user_preferences: UserPreferences,
}

impl Into<AuthenticatedUser> for prisma::user::Data {
	fn into(self) -> AuthenticatedUser {
		let user_preferences = match self
			.user_preferences()
			.expect("Failed to load user preferences")
		{
			Some(preferences) => preferences.to_owned(),
			None => unreachable!(
				"User does not have preferences. This should not be reachable."
			),
		};

		AuthenticatedUser {
			id: self.id.clone(),
			username: self.username.clone(),
			role: self.role.clone(),
			user_preferences: user_preferences.into(),
		}
	}
}

#[derive(Debug)]
pub struct DecodedCredentials {
	pub username: String,
	pub password: String,
}

#[derive(Deserialize, JsonSchema, Type)]
pub struct LoginOrRegisterArgs {
	pub username: String,
	pub password: String,
}

#[derive(Serialize, JsonSchema, Type)]
pub struct ClaimResponse {
	pub is_claimed: bool,
}
