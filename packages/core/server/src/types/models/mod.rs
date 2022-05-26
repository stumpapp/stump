pub mod library;
pub mod media;
pub mod read_progress;
pub mod series;
pub mod tag;
pub mod user;

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
	pub preferences: Option<UserPreferences>,
}

impl Into<AuthenticatedUser> for prisma::user::Data {
	fn into(self) -> AuthenticatedUser {
		AuthenticatedUser {
			id: self.id.clone(),
			username: self.username.clone(),
			role: self.role.clone(),
			// This is disgusting, but necessary for now
			preferences: Some(
				self.user_preferences()
					.expect("Relation load error")
					.unwrap()
					.to_owned()
					.into(),
			),
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
	pub checksum: Option<String>,
	pub metadata: Option<MediaMetadata>,
	pub entries: Vec<String>,
}
