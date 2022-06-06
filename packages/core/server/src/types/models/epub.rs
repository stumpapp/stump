use std::{collections::HashMap, fs::File, path::PathBuf};

use epub::doc::{EpubDoc, NavPoint};
use rocket_okapi::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{prisma::media, types::errors::ProcessFileError};

use super::media::Media;

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct EpubContent {
	label: String,
	content: PathBuf,
	play_order: usize,
}

impl Into<EpubContent> for NavPoint {
	fn into(self) -> EpubContent {
		EpubContent {
			label: self.label,
			content: self.content,
			play_order: self.play_order,
		}
	}
}

#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
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
	pub fn from(media: media::Data, epub: EpubDoc<File>) -> Epub {
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
		let epub_file = EpubDoc::new(media.path.as_str())
			.map_err(|e| ProcessFileError::EpubOpenError(e.to_string()))?;

		Ok(Epub::from(media, epub_file))
	}
}

// https://idpf.github.io/epub3-samples/30/samples.html
// https://danigm.github.io/epub-rs-doc/epub/doc/struct.EpubDoc.html
