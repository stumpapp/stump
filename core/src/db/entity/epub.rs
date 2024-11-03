use std::{collections::HashMap, fs::File, io::BufReader, path::PathBuf};

use epub::doc::{EpubDoc, NavPoint};
use serde::{Deserialize, Serialize};
use specta::Type;
use tracing::error;
use utoipa::ToSchema;

use crate::{filesystem::FileError, prisma::media};

use super::{media::Media, MediaAnnotation};

#[derive(Serialize, Deserialize, Type)]
pub struct EpubContent {
	label: String,
	content: PathBuf,
	play_order: u32,
}

impl From<NavPoint> for EpubContent {
	fn from(nav_point: NavPoint) -> EpubContent {
		EpubContent {
			label: nav_point.label,
			content: nav_point.content,
			play_order: nav_point.play_order as u32,
		}
	}
}

/*
TODO: convert spine into this structure to match epub.js
{
	"id": null,
	"idref": "dedication",
	"linear": "yes",
	"properties": [],
	"index": 3,
	"cfiBase": "/6/8",
	"href": "dedication.xhtml",
	"url": "/OEBPS/dedication.xhtml",
	"canonical": "/OEBPS/dedication.xhtml"
}
*/

#[derive(Serialize, Deserialize, Type)]
pub struct Epub {
	/// This is the epub's record in Stump's database
	pub media_entity: Media,
	/// A list of spine IDs. See https://www.w3.org/publishing/epub3/epub-ocf.html
	pub spine: Vec<String>,
	/// A hashmap of all the resources in the epub. A resource ID maps to a tuple containing the
	/// path and mime type of the resource.
	pub resources: HashMap<String, (PathBuf, String)>,
	/// A list of all the chapters in the epub.
	pub toc: Vec<EpubContent>,
	/// A hashmap of all the metadata in the epub.
	pub metadata: HashMap<String, Vec<String>>,
	/// A list of all the annotations in the epub.
	pub annotations: Option<Vec<MediaAnnotation>>,

	pub root_base: PathBuf,
	pub root_file: PathBuf,
	pub extra_css: Vec<String>,
}

/// This struct is mainly used when the Stump client sends the initial request to grab information on an epub file.
/// This will get cached on the client, which will use the metadata to make consecutive requests for various
/// resources/chapters. This struct isn't really used after that first request, everything else is file IO using [`EpubDoc`].
impl Epub {
	/// Creates an Epub from a media entity and an open [`EpubDoc`]
	pub fn from(media: media::Data, epub: EpubDoc<BufReader<File>>) -> Epub {
		let annotations = match media.annotations() {
			Ok(annotations) => Some(
				annotations
					.iter()
					.cloned()
					.map(MediaAnnotation::from)
					.collect(),
			),
			Err(_) => None,
		};

		Epub {
			media_entity: Media::from(media),
			spine: epub.spine,
			resources: epub.resources,
			toc: epub.toc.into_iter().map(|c| c.into()).collect(),
			metadata: epub.metadata,
			annotations,
			root_base: epub.root_base,
			root_file: epub.root_file,
			extra_css: epub.extra_css,
		}
	}

	/// Attempts to create an Epub from a media entity. Internally, this will attempt to open an [`EpubDoc`]
	/// from the media's path. If this fails, it will return a [`FileError::EpubOpenError`].
	pub fn try_from(media: media::Data) -> Result<Epub, FileError> {
		let epub_file = EpubDoc::new(media.path.as_str()).map_err(|e| {
			error!("Failed to open epub {}: {}", &media.path, e);
			FileError::EpubOpenError(e.to_string())
		})?;

		Ok(Epub::from(media, epub_file))
	}
}

// https://idpf.github.io/epub3-samples/30/samples.html
// https://danigm.github.io/epub-rs-doc/epub/doc/struct.EpubDoc.html
// https://help.apple.com/itc/booksassetguide/en.lproj/itc6000a3603.html

#[derive(Debug, Clone, Deserialize, Type, ToSchema)]
pub struct UpdateEpubProgress {
	pub epubcfi: String,
	pub percentage: f64,
	pub is_complete: Option<bool>,
}
