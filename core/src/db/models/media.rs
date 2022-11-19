use std::{path::Path, str::FromStr};

use optional_struct::OptionalStruct;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	prelude::{enums::FileStatus, CoreError, CoreResult},
	prisma::{media, read_progress},
};

use super::{read_progress::ReadProgress, series::Series, tag::Tag, LibraryOptions};

#[derive(Debug, Clone, Deserialize, Serialize, Type, Default, OptionalStruct)]
#[optional_name = "PartialMedia"]
#[optional_derive(Deserialize, Serialize)]
pub struct Media {
	pub id: String,
	/// The name of the media. ex: "The Amazing Spider-Man (2018) #69"
	pub name: String,
	/// The description of the media. ex: "Spidey and his superspy sister, Teresa Parker, dig to uncover THE CHAMELEON CONSPIRACY."
	pub description: Option<String>,
	/// The size of the media in bytes.
	pub size: i32,
	/// The file extension of the media. ex: "cbz"
	pub extension: String,
	/// The number of pages in the media. ex: "69"
	pub pages: i32,
	/// The timestamp when the media was last updated.
	pub updated_at: String,
	/// The timestamp when the media was created.
	pub created_at: String,
	/// The checksum hash of the file contents. Used to ensure only one instance of a file in the database.
	pub checksum: Option<String>,
	/// The path of the media. ex: "/home/user/media/comics/The Amazing Spider-Man (2018) #69.cbz"
	pub path: String,
	/// The status of the media
	pub status: FileStatus,
	/// The ID of the series this media belongs to.
	pub series_id: String,
	// The series this media belongs to. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub series: Option<Series>,
	/// The read progresses of the media. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub read_progresses: Option<Vec<ReadProgress>>,
	/// The current page of the media, computed from `read_progresses`. Will be `None` only
	/// if the `read_progresses` relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub current_page: Option<i32>,
	/// Whether or not the media is completed. Only None if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub is_completed: Option<bool>,
	/// The user assigned tags for the media. ex: ["comic", "spiderman"]. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub tags: Option<Vec<Tag>>,
}

impl TryFrom<read_progress::Data> for Media {
	type Error = CoreError;

	/// Creates a [Media] instance from the loaded relation of a [media::Data] on
	/// a [read_progress::Data] instance. If the relation is not loaded, it will
	/// return an error.
	fn try_from(data: read_progress::Data) -> Result<Self, Self::Error> {
		let relation = data.media();

		if relation.is_err() {
			return Err(CoreError::InvalidQuery(
				"Failed to load media for read progress".to_string(),
			));
		}

		let mut media = Media::from(relation.unwrap().to_owned());
		media.current_page = Some(data.page);

		Ok(media)
	}
}

#[derive(Default)]
pub struct MediaBuilderOptions {
	pub series_id: String,
	pub library_options: LibraryOptions,
}

pub trait MediaBuilder {
	fn build(path: &Path, series_id: &str) -> CoreResult<Media>;
	fn build_with_options(path: &Path, options: MediaBuilderOptions)
		-> CoreResult<Media>;
}

impl From<media::Data> for Media {
	fn from(data: media::Data) -> Media {
		let series = match data.series() {
			Ok(series) => Some(series.unwrap().to_owned().into()),
			Err(_e) => None,
		};

		let (read_progresses, current_page, is_completed) = match data.read_progresses() {
			Ok(read_progresses) => {
				let progress = read_progresses
					.iter()
					.map(|rp| rp.to_owned().into())
					.collect::<Vec<ReadProgress>>();

				// Note: ugh.
				if let Some(p) = progress.first().cloned() {
					(Some(progress), Some(p.page), Some(p.is_completed))
				} else {
					(Some(progress), None, None)
				}
			},
			Err(_e) => (None, None, None),
		};

		let tags = match data.tags() {
			Ok(tags) => Some(tags.iter().map(|tag| tag.to_owned().into()).collect()),
			Err(_e) => None,
		};

		Media {
			id: data.id,
			name: data.name,
			description: data.description,
			size: data.size,
			extension: data.extension,
			pages: data.pages,
			updated_at: data.updated_at.to_string(),
			created_at: data.created_at.to_string(),
			checksum: data.checksum,
			path: data.path,
			status: FileStatus::from_str(&data.status).unwrap_or(FileStatus::Error),
			series_id: data.series_id.unwrap(),
			series,
			read_progresses,
			current_page,
			is_completed,
			tags,
		}
	}
}
