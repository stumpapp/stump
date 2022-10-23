use serde::{Deserialize, Serialize};
use specta::Type;
use tracing::trace;

use crate::prisma;

use super::{media::Media, user::User};

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
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

impl From<prisma::read_progress::Data> for ReadProgress {
	fn from(data: prisma::read_progress::Data) -> ReadProgress {
		let media = match data.media() {
			Ok(media) => Some(media.to_owned().into()),
			Err(e) => {
				trace!("Failed to load media for read progress: {}", e);
				None
			},
		};

		let user = data.user().ok().map(|u| u.to_owned().into());

		ReadProgress {
			id: data.id,
			page: data.page,
			media_id: data.media_id,
			media,
			user_id: data.user_id,
			user,
		}
	}
}
