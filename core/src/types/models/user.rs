use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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
			Err(_e) => None,
		};

		User {
			id: self.id,
			username: self.username,
			role: self.role,
			user_preferences,
		}
	}
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]

pub struct UserPreferences {
	pub id: String,
	// pub reduce_animations: bool,
	pub locale: String,
	pub library_layout_mode: String,
	pub series_layout_mode: String,
	pub collection_layout_mode: String,
}

impl Default for UserPreferences {
	fn default() -> Self {
		Self {
			id: "DEFAULT".to_string(),
			locale: "en".to_string(),
			// reduce_animations: false,
			library_layout_mode: "GRID".to_string(),
			series_layout_mode: "GRID".to_string(),
			collection_layout_mode: "GRID".to_string(),
		}
	}
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
