use std::str::FromStr;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::{
		entity::{common::Cursor, LibraryConfig, MediaMetadata, Series, Tag},
		FileStatus,
	},
	error::CoreError,
	prisma::{active_reading_session, media},
};

use super::{ActiveReadingSession, Bookmark, FinishedReadingSession};

// TODO: Now that we have a single ActiveReadingSession, reevaluate if we need root-level fields for current_page, current_epubcfi, etc.

#[derive(Debug, Clone, Deserialize, Serialize, Type, Default, ToSchema)]
pub struct Media {
	pub id: String,
	/// The name of the media. ex: "The Amazing Spider-Man (2018) #69"
	pub name: String,
	/// The size of the media in bytes.
	pub size: i64,
	/// The file extension of the media. ex: "cbz"
	pub extension: String,
	/// The number of pages in the media. ex: "69"
	pub pages: i32,
	// TODO(specta): replace with DateTime<FixedOffset>
	/// The timestamp when the media was last updated.
	pub updated_at: String,
	// TODO(specta): replace with DateTime<FixedOffset>
	/// The timestamp when the media was created.
	pub created_at: String,
	/// The timestamp when the file was last modified on disk.
	pub modified_at: Option<String>,
	/// The hash of the file contents. Used to ensure only one instance of a file in the database.
	pub hash: Option<String>,
	/// The path of the media. ex: "/home/user/media/comics/The Amazing Spider-Man (2018) #69.cbz"
	pub path: String,
	/// The status of the media
	pub status: FileStatus,
	/// The ID of the series this media belongs to.
	pub series_id: String,
	/// Optional metadata for the media. Will be `None` if the relation is not loaded, or if the
	/// media has no metadata.
	pub metadata: Option<MediaMetadata>,
	// The series this media belongs to. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub series: Option<Series>,
	/// The active reading sessions for the media. Will be `None` only if the relation is not loaded.
	///
	/// Note: This is scoped to the current user, only.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub active_reading_session: Option<ActiveReadingSession>,
	/// The finished reading sessions for the media. Will be `None` only if the relation is not loaded.
	///
	/// Note: This is scoped to the current user, only.
	pub finished_reading_sessions: Option<Vec<FinishedReadingSession>>,
	/// The current page of the media, computed from `active_reading_sessions`. Will be `None` only
	/// if the `read_progresses` relation is not loaded or there is no progress.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub current_page: Option<i32>,
	/// The current progress in terms of epubcfi, computed from `active_reading_sessions`. Will be
	/// `None` only if the `read_progresses` relation is not loaded or there is no progress.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub current_epubcfi: Option<String>,
	/// Whether or not the media is completed. Only None if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub is_completed: Option<bool>,
	/// The user assigned tags for the media. ex: ["comic", "spiderman"]. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub tags: Option<Vec<Tag>>,
	/// Bookmarks for the media. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub bookmarks: Option<Vec<Bookmark>>,
}

impl Media {
	/// A convenience method to get the title of the media. If the metadata has a title, it will
	/// return that. Otherwise, it will return the name of the media (which is the filename).
	pub fn title(&self) -> String {
		self.metadata
			.as_ref()
			.and_then(|m| m.title.clone())
			.unwrap_or_else(|| self.name.clone())
	}
}

impl Cursor for Media {
	fn cursor(&self) -> String {
		self.id.clone()
	}
}

impl TryFrom<active_reading_session::Data> for Media {
	type Error = CoreError;

	/// Creates a [Media] instance from the loaded relation of a [media::Data] on
	/// a [active_reading_session::Data] instance. If the relation is not loaded, it will
	/// return an error.
	fn try_from(data: active_reading_session::Data) -> Result<Self, Self::Error> {
		let Ok(media) = data.media() else {
			return Err(CoreError::InvalidQuery(
				"Failed to load media for read progress".to_string(),
			));
		};

		let mut media = Media::from(media.to_owned());
		media.current_page = data.page;
		media.current_epubcfi = data.epubcfi;

		Ok(media)
	}
}

#[derive(Default)]
pub struct MediaBuilderOptions {
	pub series_id: String,
	pub library_options: LibraryConfig,
}

impl From<media::Data> for Media {
	fn from(data: media::Data) -> Media {
		let series = match data.series() {
			Ok(series) => Some(series.unwrap().to_owned().into()),
			Err(_e) => None,
		};

		let active_reading_session = match data.active_user_reading_sessions() {
			Ok(sessions) => sessions.first().cloned().map(ActiveReadingSession::from),
			Err(_e) => None,
		};
		let (current_page, current_epubcfi) = active_reading_session
			.as_ref()
			.map(|session| (session.page, session.epubcfi.clone()))
			.unwrap_or((None, None));

		let finished_reading_sessions = match data.finished_user_reading_sessions() {
			Ok(sessions) => Some(
				sessions
					.iter()
					.map(|data| FinishedReadingSession::from(data.to_owned()))
					.collect::<Vec<FinishedReadingSession>>(),
			),
			Err(_e) => None,
		};
		let is_completed = finished_reading_sessions
			.as_ref()
			.map(Vec::is_empty)
			.map(|b| !b);

		let tags = match data.tags() {
			Ok(tags) => Some(tags.iter().map(|tag| tag.to_owned().into()).collect()),
			Err(_e) => None,
		};

		let metadata = match data.metadata() {
			Ok(opt) => opt.map(|m| MediaMetadata::from(m.to_owned())),
			Err(_e) => None,
		};

		let bookmarks = data.bookmarks().ok().map(|bookmarks| {
			bookmarks
				.iter()
				.map(|data| Bookmark::from(data.to_owned()))
				.collect::<Vec<Bookmark>>()
		});

		Media {
			id: data.id,
			name: data.name,
			size: data.size,
			extension: data.extension,
			pages: data.pages,
			updated_at: data.updated_at.to_rfc3339(),
			created_at: data.created_at.to_rfc3339(),
			modified_at: data.modified_at.map(|dt| dt.to_rfc3339()),
			hash: data.hash,
			path: data.path,
			status: FileStatus::from_str(&data.status).unwrap_or(FileStatus::Error),
			series_id: data.series_id.unwrap(),
			metadata,
			series,
			active_reading_session,
			finished_reading_sessions,
			current_page,
			current_epubcfi,
			is_completed,
			tags,
			bookmarks,
		}
	}
}
