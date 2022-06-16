use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::prisma;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
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
				log::debug!("Failed to load user preferences for user: {}", e);
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

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserPreferences {
	pub id: String,
	pub reduce_animations: bool,
	pub library_view_mode: String,
	pub series_view_mode: String,
	pub collection_view_mode: String,
}

impl Into<UserPreferences> for prisma::user_preferences::Data {
	fn into(self) -> UserPreferences {
		UserPreferences {
			id: self.id.clone(),
			reduce_animations: self.reduce_animations,
			library_view_mode: self.library_view_mode.clone(),
			series_view_mode: self.series_view_mode.clone(),
			collection_view_mode: self.collection_view_mode.clone(),
		}
	}
}
