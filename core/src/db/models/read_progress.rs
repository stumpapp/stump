use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma;

use super::{media::Media, user::User};

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema, Default)]
pub struct ReadProgress {
	pub id: String,
	/// The current page
	pub page: i32,
	/// The current epubcfi
	pub epubcfi: Option<String>,
	// The percentage completed
	pub percentage_completed: Option<f64>,
	/// boolean to indicate if the media is completed
	pub is_completed: bool,
	/// The timestamp when the progress was completed
	pub completed_at: Option<String>,
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
			Err(_) => None,
		};

		let user = data.user().ok().map(|u| User::from(u.to_owned()));

		ReadProgress {
			id: data.id,
			page: data.page,
			epubcfi: data.epubcfi,
			is_completed: data.is_completed,
			completed_at: data.completed_at.map(|t| t.to_string()),
			percentage_completed: data.percentage_completed,
			media_id: data.media_id,
			media,
			user_id: data.user_id,
			user,
		}
	}
}
