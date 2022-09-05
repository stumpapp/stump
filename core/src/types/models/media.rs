use std::path::PathBuf;

use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{config::context::Ctx, prisma};

use super::{read_progress::ReadProgress, series::Series, tag::Tag};

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema, Type)]
#[serde(rename_all = "camelCase")]
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
	// pub updated_at: DateTime<FixedOffset>,
	pub updated_at: String,
	/// The checksum hash of the file contents. Used to ensure only one instance of a file in the database.
	pub checksum: Option<String>,
	/// The path of the media. ex: "/home/user/media/comics/The Amazing Spider-Man (2018) #69.cbz"
	pub path: String,
	/// The ID of the series this media belongs to.
	pub series_id: String,
	// The series this media belongs to. Will be `None` only if the relation is not loaded.
	pub series: Option<Series>,
	/// The read progresses of the media. Will be `None` only if the relation is not loaded.
	pub read_progresses: Option<Vec<ReadProgress>>,
	/// The current page of the media, computed from `read_progresses`. Will be `None` only
	/// if the `read_progresses` relation is not loaded.
	pub current_page: Option<i32>,
	/// The user assigned tags for the media. ex: ["comic", "spiderman"]. Will be `None` only if the relation is not loaded.
	pub tags: Option<Vec<Tag>>,
	// pub status: String,
}

// Note: used internally...
pub struct TentativeMedia {
	pub name: String,
	pub description: Option<String>,
	pub size: i32,
	pub extension: String,
	pub pages: i32,
	pub checksum: Option<String>,
	pub path: String,
	pub series_id: String,
}

impl TentativeMedia {
	pub fn into_action<'a>(self, ctx: &'a Ctx) -> prisma::media::Create<'a> {
		ctx.db.media().create(
			self.name,
			self.size,
			self.extension,
			self.pages,
			self.path,
			vec![
				prisma::media::checksum::set(self.checksum),
				prisma::media::description::set(self.description),
				prisma::media::series::connect(prisma::series::id::equals(
					self.series_id,
				)),
			],
		)
	}
}

impl Into<Media> for prisma::media::Data {
	fn into(self) -> Media {
		let series = match self.series() {
			Ok(series) => Some(series.unwrap().to_owned().into()),
			Err(_e) => {
				// log::debug!("Failed to load series for media: {}", e);
				None
			},
		};

		let read_progresses = match self.read_progresses() {
			Ok(read_progresses) => Some(
				read_progresses
					.into_iter()
					.map(|rp| rp.to_owned().into())
					.collect(),
			),
			Err(e) => {
				log::trace!("Failed to load read progresses for media: {}", e);
				None
			},
		};

		let tags = match self.tags() {
			Ok(tags) => Some(tags.into_iter().map(|tag| tag.to_owned().into()).collect()),
			Err(_e) => {
				// log::debug!("Failed to load tags for media: {}", e);
				None
			},
		};

		Media {
			id: self.id,
			name: self.name,
			description: self.description,
			size: self.size,
			extension: self.extension,
			pages: self.pages,
			updated_at: self.updated_at.to_string(),
			checksum: self.checksum,
			path: self.path,
			series_id: self.series_id.unwrap(),
			series,
			read_progresses,
			// TODO:
			current_page: None,
			tags,
		}
	}
}

// Derived from ComicInfo.xml
#[derive(Debug, Serialize, Deserialize, PartialEq, Type)]
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
	pub thumbnail_path: Option<PathBuf>,
	pub path: PathBuf,
	pub checksum: Option<String>,
	pub metadata: Option<MediaMetadata>,
	pub pages: i32,
}
