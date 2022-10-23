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

impl From<prisma::user::Data> for User {
	fn from(data: prisma::user::Data) -> User {
		let user_preferences = match data.user_preferences() {
			Ok(up) => Some(up.unwrap().to_owned().into()),
			Err(_e) => None,
		};

		User {
			id: data.id,
			username: data.username,
			role: data.role,
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

impl From<prisma::user_preferences::Data> for UserPreferences {
	fn from(data: prisma::user_preferences::Data) -> UserPreferences {
		UserPreferences {
			id: data.id,
			locale: data.locale,
			// reduce_animations: data.reduce_animations,
			library_layout_mode: data.library_layout_mode,
			series_layout_mode: data.series_layout_mode,
			collection_layout_mode: data.collection_layout_mode,
		}
	}
}
