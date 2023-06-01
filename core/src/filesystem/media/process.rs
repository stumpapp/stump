use std::{
	collections::HashMap,
	path::{Path, PathBuf},
};

use serde::{Deserialize, Deserializer, Serialize};
use specta::Type;
use tracing::debug;

use crate::{
	db::entity::LibraryOptions,
	filesystem::{content_type::ContentType, epub::EpubProcessor, error::FileError},
};

use super::{rar::RarProcessor, zip::ZipProcessor};

#[derive(Debug)]
pub struct FileProcessorOptions {
	pub convert_rar_to_zip: bool,
	pub delete_conversion_source: bool,
}

impl From<LibraryOptions> for FileProcessorOptions {
	fn from(options: LibraryOptions) -> Self {
		Self {
			convert_rar_to_zip: options.convert_rar_to_zip,
			delete_conversion_source: options.hard_delete_conversions,
		}
	}
}

impl From<&LibraryOptions> for FileProcessorOptions {
	fn from(options: &LibraryOptions) -> Self {
		Self {
			convert_rar_to_zip: options.convert_rar_to_zip,
			delete_conversion_source: options.hard_delete_conversions,
		}
	}
}

/// Trait defining a standard API for processing files throughout Stump. Every
/// supported file type should implement this trait.
pub trait FileProcessor {
	fn get_sample_size(path: &str) -> Result<u64, FileError>;
	fn hash(path: &str) -> Option<String>;
	fn process(
		path: &str,
		options: FileProcessorOptions,
	) -> Result<ProcessedFile, FileError>;
	fn get_page(path: &str, page: i32) -> Result<(ContentType, Vec<u8>), FileError>;
	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError>;
}

/// Struct representing a processed file. This is the output of the `process` function
/// on a `FileProcessor` implementation.
pub struct ProcessedFile {
	pub path: PathBuf,
	pub hash: Option<String>,
	pub metadata: Option<Metadata>,
	pub pages: i32,
}

fn string_list_deserializer<'de, D>(
	deserializer: D,
) -> Result<Option<Vec<String>>, D::Error>
where
	D: Deserializer<'de>,
{
	let str_sequence = String::deserialize(deserializer)?;
	Ok(Some(
		str_sequence
			.split(',')
			.map(|item| item.trim().to_owned())
			.collect(),
	))
}

// NOTE: alias is used primarily to support ComicInfo.xml files, as that metadata
// is formatted in PascalCase
// TODO: string array for some of these, figure out which ones...
/// Struct representing the metadata for a processed file.
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Type, Default)]
pub struct Metadata {
	#[serde(alias = "Title")]
	pub title: Option<String>,
	#[serde(alias = "Series")]
	pub series: Option<String>,
	#[serde(alias = "Number")]
	pub number: Option<u32>,
	#[serde(alias = "Volume")]
	pub volume: Option<u32>,
	#[serde(alias = "Summary")]
	pub summary: Option<String>,
	#[serde(alias = "Notes")]
	pub notes: Option<String>,
	#[serde(alias = "Genre", deserialize_with = "string_list_deserializer")]
	pub genre: Option<Vec<String>>,

	#[serde(alias = "Year")]
	pub year: Option<u32>,
	#[serde(alias = "Month")]
	pub month: Option<u32>,
	#[serde(alias = "Day")]
	pub day: Option<u32>,

	#[serde(alias = "Writer", deserialize_with = "string_list_deserializer")]
	pub writers: Option<Vec<String>>,
	#[serde(alias = "Penciller")]
	pub penciller: Option<String>,
	#[serde(alias = "Inker")]
	pub inker: Option<String>,
	#[serde(alias = "Colorist")]
	pub colorist: Option<String>,
	#[serde(alias = "Letterer")]
	pub letterer: Option<String>,
	#[serde(alias = "CoverArtist")]
	pub cover_artist: Option<String>,
	#[serde(alias = "Editor")]
	pub editor: Option<String>,
	#[serde(alias = "Publisher")]
	pub publisher: Option<String>,
	#[serde(alias = "Web", deserialize_with = "string_list_deserializer")]
	pub links: Option<Vec<String>>,
	#[serde(alias = "Characters", deserialize_with = "string_list_deserializer")]
	pub characters: Option<Vec<String>>,
	#[serde(alias = "Teams", deserialize_with = "string_list_deserializer")]
	pub teams: Option<Vec<String>>,

	#[serde(alias = "PageCount")]
	pub page_count: Option<u32>,
	// TODO: pages, e.g. <Pages><Page Image="0" Type="FrontCover" ImageSize="741291" /></Pages>
}

// NOTE: this is primarily used for converting the EPUB metadata into a common Metadata struct
impl From<HashMap<String, Vec<String>>> for Metadata {
	fn from(map: HashMap<String, Vec<String>>) -> Self {
		let mut metadata = Metadata::default();

		for (key, value) in map {
			match key.to_lowercase().as_str() {
				"title" => metadata.title = Some(value.join("\n").to_string()),
				"series" => metadata.series = Some(value.join("\n").to_string()),
				"number" => {
					metadata.number =
						value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"volume" => {
					metadata.volume =
						value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"summary" => metadata.summary = Some(value.join("\n").to_string()),
				"notes" => metadata.notes = Some(value.join("\n").to_string()),
				"genre" => metadata.genre = Some(value),
				"year" => {
					metadata.year = value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"month" => {
					metadata.month = value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"day" => {
					metadata.day = value.into_iter().next().and_then(|n| n.parse().ok())
				},
				"writers" => metadata.writers = Some(value),
				"penciller" => metadata.penciller = Some(value.join("\n").to_string()),
				"inker" => metadata.inker = Some(value.join("\n").to_string()),
				"colorist" => metadata.colorist = Some(value.join("\n").to_string()),
				"letterer" => metadata.letterer = Some(value.join("\n").to_string()),
				"coverartist" => {
					metadata.cover_artist = Some(value.join("\n").to_string())
				},
				"editor" => metadata.editor = Some(value.join("\n").to_string()),
				"publisher" => metadata.publisher = Some(value.join("\n").to_string()),
				"links" => metadata.links = Some(value),
				"characters" => metadata.characters = Some(value),
				"teams" => metadata.teams = Some(value),
				"pagecount" => {
					metadata.page_count =
						value.into_iter().next().and_then(|n| n.parse().ok())
				},
				_ => (),
			}
		}

		metadata
	}
}

pub fn process(
	path: &Path,
	options: FileProcessorOptions,
) -> Result<ProcessedFile, FileError> {
	debug!(?path, ?options, "Processing entry");
	let mime = ContentType::from_path(path).mime_type();

	let path_str = path.to_str().unwrap_or_default();

	match mime.as_str() {
		"application/zip" => ZipProcessor::process(path_str, options),
		"application/vnd.comicbook+zip" => ZipProcessor::process(path_str, options),
		"application/vnd.rar" => RarProcessor::process(path_str, options),
		"application/vnd.comicbook-rar" => RarProcessor::process(path_str, options),
		"application/epub+zip" => EpubProcessor::process(path_str, options),
		_ => Err(FileError::UnsupportedFileType(path.display().to_string())),
	}
}

pub fn get_page(path: &str, page: i32) -> Result<(ContentType, Vec<u8>), FileError> {
	let mime = ContentType::from_file(path).mime_type();

	match mime.as_str() {
		"application/zip" => ZipProcessor::get_page(path, page),
		"application/vnd.comicbook+zip" => ZipProcessor::get_page(path, page),
		"application/vnd.rar" => RarProcessor::get_page(path, page),
		"application/vnd.comicbook-rar" => RarProcessor::get_page(path, page),
		"application/epub+zip" => EpubProcessor::get_page(path, page),
		_ => Err(FileError::UnsupportedFileType(path.to_string())),
	}
}

pub fn get_content_types_for_pages(
	path: &str,
	pages: Vec<i32>,
) -> Result<HashMap<i32, ContentType>, FileError> {
	let mime = ContentType::from_file(path).mime_type();

	match mime.as_str() {
		"application/zip" => ZipProcessor::get_page_content_types(path, pages),
		"application/vnd.comicbook+zip" => {
			ZipProcessor::get_page_content_types(path, pages)
		},
		"application/vnd.rar" => RarProcessor::get_page_content_types(path, pages),
		"application/vnd.comicbook-rar" => {
			RarProcessor::get_page_content_types(path, pages)
		},
		"application/epub+zip" => EpubProcessor::get_page_content_types(path, pages),
		_ => Err(FileError::UnsupportedFileType(path.to_string())),
	}
}
