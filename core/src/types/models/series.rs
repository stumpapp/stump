use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::prisma;

use super::{library::Library, media::Media, tag::Tag};

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, Type)]
#[serde(rename_all = "camelCase")]
pub struct Series {
	pub id: String,
	/// The name of the series. ex: "The Amazing Spider-Man (2018)"
	pub name: String,
	/// The path to the series. ex: "/home/user/media/comics/The Amazing Spider-Man (2018)"
	pub path: String,
	/// The description of the series. ex: "The best series ever"
	pub description: Option<String>,
	/// The status of the series since last scan or access
	pub status: String,
	// pub updated_at: DateTime<FixedOffset>,
	pub updated_at: String,
	/// The ID of the library this series belongs to.
	pub library_id: String,
	/// The library this series belongs to. Will be `None` only if the relation is not loaded.
	pub library: Option<Library>,
	/// The media that are in this series. Will be `None` only if the relation is not loaded.
	pub media: Option<Vec<Media>>,
	/// The number of media in this series. Optional for safety, but should be loaded if possible.
	pub media_count: Option<i32>,
	/// The user assigned tags for the series. ex: ["comic", "family"]. Will be `None` only if the relation is not loaded.
	pub tags: Option<Vec<Tag>>,
}

impl Series {
	// Note: this is not great practice, and will eventually change...
	pub fn without_media(mut series: Series, media_count: i32) -> Series {
		series.media = None;

		Series {
			media_count: Some(media_count),
			..series
		}
	}

	pub fn set_media_count(&mut self, count: i32) {
		self.media_count = Some(count);
	}
}

impl Into<Series> for prisma::series::Data {
	fn into(self) -> Series {
		let library = match self.library() {
			Ok(library) => Some(library.unwrap().to_owned().into()),
			Err(e) => {
				log::trace!("Failed to load library for series: {}", e);
				None
			},
		};

		let (media, media_count) = match self.media() {
			Ok(media) => {
				let m = media
					.into_iter()
					.map(|m| m.to_owned().into())
					.collect::<Vec<Media>>();
				let m_ct = media.len() as i32;

				(Some(m), Some(m_ct))
			},
			Err(e) => {
				log::trace!("Failed to load media for series: {}", e);
				(None, None)
			},
		};

		let tags = match self.tags() {
			Ok(tags) => Some(tags.into_iter().map(|tag| tag.to_owned().into()).collect()),
			Err(e) => {
				log::trace!("Failed to load tags for series: {}", e);
				None
			},
		};

		Series {
			id: self.id,
			name: self.name,
			path: self.path,
			description: self.description,
			status: self.status,
			updated_at: self.updated_at.to_string(),
			library_id: self.library_id.unwrap(),
			library,
			media,
			media_count,
			tags,
		}
	}
}

impl Into<Series> for (prisma::series::Data, i32) {
	fn into(self) -> Series {
		let (series, media_count) = self;

		Series::without_media(series.into(), media_count)
	}
}
