use std::{collections::HashMap, fs::File, io::BufReader, path::PathBuf};

use epub::doc::{EpubDoc, NavPoint};
use serde::{Deserialize, Serialize};
use specta::Type;
use tracing::error;

use crate::{prelude::errors::ProcessFileError, prisma::media};

use super::media::Media;

#[derive(Serialize, Deserialize, Type)]
pub struct EpubContent {
	label: String,
	content: PathBuf,
	play_order: usize,
}

impl From<NavPoint> for EpubContent {
	fn from(nav_point: NavPoint) -> EpubContent {
		EpubContent {
			label: nav_point.label,
			content: nav_point.content,
			play_order: nav_point.play_order,
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

	pub toc: Vec<EpubContent>,

	pub metadata: HashMap<String, Vec<String>>,

	pub root_base: PathBuf,
	pub root_file: PathBuf,
	pub extra_css: Vec<String>,
}

/// This struct is mainly used when the Stump client sends the inital request to grab information on an epub file.
/// This will get cached on the client, which will use the metadata to make consecutive requests for various
/// resources/chapters. This struct isn't really used after that first request, everything else is file IO using EpubDoc.
impl Epub {
	/// Creates an Epub from a media entity and an open EpubDoc
	pub fn from(media: media::Data, epub: EpubDoc<BufReader<File>>) -> Epub {
		Epub {
			media_entity: media.into(),
			spine: epub.spine,
			resources: epub.resources,
			toc: epub.toc.into_iter().map(|c| c.into()).collect(),
			metadata: epub.metadata,
			root_base: epub.root_base,
			root_file: epub.root_file,
			extra_css: epub.extra_css,
		}
	}

	/// Attempts to create an Epub from a media entity. Internally, this will attempt to open
	/// an EpubDoc from the media's path. If this fails, it will return an EpubOpenError.
	pub fn try_from(media: media::Data) -> Result<Epub, ProcessFileError> {
		let epub_file = EpubDoc::new(media.path.as_str()).map_err(|e| {
			error!("Failed to open epub {}: {}", &media.path, e);
			ProcessFileError::EpubOpenError(e.to_string())
		})?;

		Ok(Epub::from(media, epub_file))
	}
}

// https://idpf.github.io/epub3-samples/30/samples.html
// https://danigm.github.io/epub-rs-doc/epub/doc/struct.EpubDoc.html
// https://help.apple.com/itc/booksassetguide/en.lproj/itc6000a3603.html
