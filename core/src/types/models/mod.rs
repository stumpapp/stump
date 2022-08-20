pub mod epub;
pub mod library;
pub mod list_directory;
pub mod log;
pub mod media;
pub mod read_progress;
pub mod series;
pub mod tag;
pub mod user;

use std::path::PathBuf;

use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::prisma;

use self::user::UserPreferences;

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
pub struct AuthenticatedUser {
	pub id: String,
	pub username: String,
	pub role: String,
	// FIXME: once issue 44 is resolved, remove Option
	pub preferences: UserPreferences,
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
			preferences: user_preferences.into(),
		}
	}
}

#[derive(Debug)]
pub struct DecodedCredentials {
	pub username: String,
	pub password: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct LoginRequest {
	pub username: String,
	pub password: String,
}

// Derived from ComicInfo.xml
#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MediaMetadata {
	#[serde(rename = "Series")]
	pub series: Option<String>,
	#[serde(rename = "Number")]
	pub number: Option<usize>,
	#[serde(rename = "Web")]
	pub web: Option<String>,
	#[serde(rename = "Summary")]
	pub summary: Option<String>,
	#[serde(rename = "Publisher")]
	pub publisher: Option<String>,
	#[serde(rename = "Genre")]
	pub genre: Option<String>,
	#[serde(rename = "PageCount")]
	pub page_count: Option<usize>,
}

impl MediaMetadata {
	pub fn default() -> Self {
		Self {
			series: None,
			number: None,
			web: None,
			summary: None,
			publisher: None,
			genre: None,
			page_count: None,
		}
	}
}

pub struct ProcessedMediaFile {
	pub path: PathBuf,
	pub checksum: Option<String>,
	pub metadata: Option<MediaMetadata>,
	pub pages: i32,
}
