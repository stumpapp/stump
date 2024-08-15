use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::{active_reading_session, finished_reading_session};

use crate::db::entity::{Media, User};

use super::prisma_macros::reading_session_with_book_pages;

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema, Default)]
pub struct ActiveReadingSession {
	pub id: String,
	/// The current page, None if the media is not image-based
	pub page: Option<i32>,
	/// The current epubcfi
	pub epubcfi: Option<String>,
	// The percentage completed
	pub percentage_completed: Option<f64>,
	/// The timestamp when the reading session was started
	pub started_at: String,
	/// The ID of the media which has progress.
	pub media_id: String,
	/// The media which has progress. Will be `None` if the relation is not loaded.
	pub media: Option<Box<Media>>,
	/// The ID of the user who this progress belongs to.
	pub user_id: String,
	/// The user who this progress belongs to. Will be `None` if the relation is not loaded.
	pub user: Option<Box<User>>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema, Default)]
pub struct FinishedReadingSession {
	pub id: String,
	/// The timestamp when the reading session was started
	pub started_at: String,
	/// The timestamp when the reading session was completed
	pub completed_at: String,
	/// The ID of the media which has progress.
	pub media_id: String,
	/// The media which has progress. Will be `None` if the relation is not loaded.
	pub media: Option<Media>,
	/// The ID of the user who this progress belongs to.
	pub user_id: String,
	/// The user who this progress belongs to. Will be `None` if the relation is not loaded.
	pub user: Option<User>,
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, ToSchema)]
#[serde(untagged)]
pub enum ProgressUpdateReturn {
	Active(ActiveReadingSession),
	Finished(FinishedReadingSession),
}

impl From<active_reading_session::Data> for ActiveReadingSession {
	fn from(data: active_reading_session::Data) -> ActiveReadingSession {
		let media = match data.media() {
			Ok(media) => Some(Box::new(media.to_owned().into())),
			Err(_) => None,
		};

		let user = data.user().ok().cloned().map(User::from);

		ActiveReadingSession {
			id: data.id,
			page: data.page,
			epubcfi: data.epubcfi,
			started_at: data.started_at.to_rfc3339(),
			percentage_completed: data.percentage_completed,
			media_id: data.media_id,
			media,
			user_id: data.user_id,
			user: user.map(Box::new),
		}
	}
}

impl From<reading_session_with_book_pages::Data> for ActiveReadingSession {
	fn from(value: reading_session_with_book_pages::Data) -> Self {
		ActiveReadingSession {
			id: value.id,
			page: value.page,
			epubcfi: value.epubcfi,
			percentage_completed: value.percentage_completed,
			started_at: value.started_at.to_rfc3339(),
			media_id: value.media_id,
			media: None,
			user_id: value.user_id,
			user: None,
		}
	}
}

impl From<finished_reading_session::Data> for FinishedReadingSession {
	fn from(data: finished_reading_session::Data) -> FinishedReadingSession {
		let media = match data.media() {
			Ok(media) => Some(media.to_owned().into()),
			Err(_) => None,
		};

		let user = data.user().ok().cloned().map(User::from);

		FinishedReadingSession {
			id: data.id,
			started_at: data.started_at.to_rfc3339(),
			completed_at: data.completed_at.to_rfc3339(),
			media_id: data.media_id,
			media,
			user_id: data.user_id,
			user,
		}
	}
}
