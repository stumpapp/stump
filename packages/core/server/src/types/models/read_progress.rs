use rocket_okapi::JsonSchema;
use serde::Serialize;

use crate::prisma;

use super::{media::Media, user::User};

#[derive(Debug, Clone, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReadProgress {
	pub id: String,
	/// The current page
	pub page: i32,
	/// The ID of the media which has progress.
	pub media_id: String,
	/// The media which has progress. Will be `None` if the relation is not loaded.
	pub media: Option<Media>,
	/// The ID of the user who this progress belongs to.
	pub user_id: String,
	/// The user who this progress belongs to. Will be `None` if the relation is not loaded.
	pub user: Option<User>,
}

impl Into<ReadProgress> for prisma::read_progress::Data {
	fn into(self) -> ReadProgress {
		let media = match self.media() {
			Ok(media) => Some(media.to_owned().into()),
			Err(e) => {
				log::debug!("Failed to load media for read progress: {}", e);
				None
			},
		};

		let user = match self.user() {
			Ok(user) => Some(user.to_owned().into()),
			Err(e) => {
				log::debug!("Failed to load user for read progress: {}", e);
				None
			},
		};

		ReadProgress {
			id: self.id,
			page: self.page,
			media_id: self.media_id,
			media,
			user_id: self.user_id,
			user,
		}
	}
}
