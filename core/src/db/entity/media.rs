use std::str::FromStr;

use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	error::CoreError,
	prisma::{media, media_annotation, read_progress},
};

use super::{
	common::FileStatus, metadata::MediaMetadata, read_progress::ReadProgress,
	series::Series, tag::Tag, Cursor, LibraryOptions,
};

#[derive(Debug, Clone, Deserialize, Serialize, Type, Default, ToSchema)]
pub struct Media {
	pub id: String,
	/// The name of the media. ex: "The Amazing Spider-Man (2018) #69"
	pub name: String,
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
	/// The read progresses of the media. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub read_progresses: Option<Vec<ReadProgress>>,
	/// The current page of the media, computed from `read_progresses`. Will be `None` only
	/// if the `read_progresses` relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub current_page: Option<i32>,
	/// The current progress in terms of epubcfi
	#[serde(skip_serializing_if = "Option::is_none")]
	pub current_epubcfi: Option<String>,
	/// Whether or not the media is completed. Only None if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub is_completed: Option<bool>,
	/// The user assigned tags for the media. ex: ["comic", "spiderman"]. Will be `None` only if the relation is not loaded.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub tags: Option<Vec<Tag>>,
}

impl Media {
	// NOTE: currently, this will only look at a few fields:
	// - name
	// - description
	// - size
	// - pages
	// - modified_at
	// - status
	// It's also a fairly naive implementation, effectively blindly overwriting
	// the fields of the current media with the newer media. This is fine for now,
	// but will eventually need to change to be more intelligent.
	pub fn resolve_changes(&self, newer: &Media) -> Media {
		Media {
			name: newer.name.clone(),
			size: newer.size,
			pages: newer.pages,
			modified_at: newer.modified_at.clone(),
			status: newer.status,
			hash: newer.hash.clone().or_else(|| self.hash.clone()),
			..self.clone()
		}
	}
}

impl Cursor for Media {
	fn cursor(&self) -> String {
		self.id.clone()
	}
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, Default, ToSchema)]
pub enum MediaAnnotationKind {
	#[serde(rename = "HIGHLIGHT")]
	Highlight,
	#[serde(rename = "NOTE")]
	Note,
	#[serde(rename = "BOOKMARK")]
	#[default]
	Bookmark,
}

impl FromStr for MediaAnnotationKind {
	type Err = CoreError;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		match s {
			"HIGHLIGHT" => Ok(MediaAnnotationKind::Highlight),
			"NOTE" => Ok(MediaAnnotationKind::Note),
			"BOOKMARK" => Ok(MediaAnnotationKind::Bookmark),
			_ => Err(CoreError::InternalError(format!(
				"Invalid media annotation kind: {}",
				s
			))),
		}
	}
}

impl From<String> for MediaAnnotationKind {
	fn from(s: String) -> MediaAnnotationKind {
		MediaAnnotationKind::from_str(s.as_str()).unwrap_or_default()
	}
}

#[derive(Debug, Clone, Deserialize, Serialize, Type, Default, ToSchema)]
pub struct MediaAnnotation {
	pub id: String,
	// The kind of annotation
	pub kind: MediaAnnotationKind,
	// The epubcfi associated with the annotation. This can be a range or a single point.
	pub epubcfi: Option<String>,
	// The text associated with the annotation. This can be a user entered note, or some
	// visual indicator of the annotation.
	pub text: Option<String>,
	// The media this annotation belongs to
	pub media_id: String,
	pub media: Option<Media>,
}

impl From<media_annotation::Data> for MediaAnnotation {
	fn from(data: media_annotation::Data) -> Self {
		let media = match data.media() {
			Ok(media) => Some(Media::from(media.to_owned())),
			Err(_) => None,
		};

		MediaAnnotation {
			id: data.id,
			kind: MediaAnnotationKind::from(data.kind),
			epubcfi: data.epubcfi,
			text: data.text,
			media_id: data.media_id,
			media,
		}
	}
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

impl From<media::Data> for Media {
	fn from(data: media::Data) -> Media {
		let series = match data.series() {
			Ok(series) => Some(series.unwrap().to_owned().into()),
			Err(_e) => None,
		};

		let (read_progresses, current_page, is_completed, epubcfi) =
			match data.read_progresses() {
				Ok(read_progresses) => {
					let progress = read_progresses
						.iter()
						.map(|rp| rp.to_owned().into())
						.collect::<Vec<ReadProgress>>();

					// Note: ugh.
					if let Some(p) = progress.first().cloned() {
						(
							Some(progress),
							Some(p.page),
							Some(p.is_completed),
							p.epubcfi,
						)
					} else {
						(Some(progress), None, None, None)
					}
				},
				Err(_e) => (None, None, None, None),
			};

		let tags = match data.tags() {
			Ok(tags) => Some(tags.iter().map(|tag| tag.to_owned().into()).collect()),
			Err(_e) => None,
		};

		let metadata = match data.metadata() {
			Ok(opt) => opt.map(|m| MediaMetadata::from(m.to_owned())),
			Err(_e) => None,
		};

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
			read_progresses,
			current_page,
			current_epubcfi: epubcfi,
			is_completed,
			tags,
		}
	}
}
