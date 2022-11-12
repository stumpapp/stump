use std::str::FromStr;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{prelude::enums::FileStatus, prisma};

use super::{library::Library, media::Media, tag::Tag};

#[derive(Debug, Clone, Deserialize, Serialize, Type)]
pub struct Series {
	pub id: String,
	/// The name of the series. ex: "The Amazing Spider-Man (2018)"
	pub name: String,
	/// The path to the series. ex: "/home/user/media/comics/The Amazing Spider-Man (2018)"
	pub path: String,
	/// The description of the series. ex: "The best series ever"
	pub description: Option<String>,
	/// The status of the series since last scan or access
	pub status: FileStatus,
	/// The timestamp of when the series was last updated
	pub updated_at: String,
	/// The timestamp of when the series was created
	pub created_at: String,
	/// The ID of the library this series belongs to.
	pub library_id: String,
	/// The library this series belongs to. Will be `None` only if the relation is not loaded.
	pub library: Option<Library>,
	/// The media that are in this series. Will be `None` only if the relation is not loaded.
	pub media: Option<Vec<Media>>,
	#[serde(skip_serializing_if = "Option::is_none")]
	/// The number of media in this series. Optional for safety, but should be loaded if possible.
	pub media_count: Option<i64>,
	#[serde(skip_serializing_if = "Option::is_none")]
	/// The number of media in this series which have not been read. Only loaded on some queries.
	pub unread_media_count: Option<i64>,
	/// The user assigned tags for the series. ex: ["comic", "family"]. Will be `None` only if the relation is not loaded.
	pub tags: Option<Vec<Tag>>,
}

impl Series {
	// Note: this is not great practice, and will eventually change...
	pub fn without_media(mut series: Series, media_count: i64) -> Series {
		series.media = None;

		Series {
			media_count: Some(media_count),
			..series
		}
	}

	pub fn set_media_count(&mut self, count: i64) {
		self.media_count = Some(count);
	}
}

impl From<prisma::series::Data> for Series {
	fn from(data: prisma::series::Data) -> Series {
		let library = match data.library() {
			Ok(library) => Some(library.unwrap().to_owned().into()),
			Err(_e) => None,
		};

		let (media, media_count) = match data.media() {
			Ok(media) => {
				let m = media
					.iter()
					.map(|m| m.to_owned().into())
					.collect::<Vec<Media>>();
				let m_ct = media.len() as i64;

				(Some(m), Some(m_ct))
			},
			Err(_e) => (None, None),
		};

		let tags = match data.tags() {
			Ok(tags) => Some(tags.iter().map(|tag| tag.to_owned().into()).collect()),
			Err(_e) => None,
		};

		Series {
			id: data.id,
			name: data.name,
			path: data.path,
			description: data.description,
			status: FileStatus::from_str(&data.status).unwrap_or(FileStatus::Error),
			updated_at: data.updated_at.to_string(),
			created_at: data.created_at.to_string(),
			library_id: data.library_id.unwrap(),
			library,
			media,
			media_count,
			unread_media_count: None,
			tags,
		}
	}
}

impl From<(prisma::series::Data, i64)> for Series {
	fn from(tuple: (prisma::series::Data, i64)) -> Series {
		let (series, media_count) = tuple;

		Series::without_media(series.into(), media_count)
	}
}
