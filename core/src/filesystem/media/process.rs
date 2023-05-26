use std::{
	collections::HashMap,
	path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
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
	pub thumbnail_path: Option<PathBuf>,
	pub path: PathBuf,
	pub hash: Option<String>,
	pub metadata: Option<Metadata>,
	pub pages: i32,
}

// NOTE: alias is used primarily to support ComicInfo.xml files, as that metadata
// is formatted in PascalCase
/// Struct representing the metadata for a processed file.
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Type, Default)]
pub struct Metadata {
	#[serde(alias = "Series")]
	pub series: Option<String>,
	#[serde(alias = "Number")]
	pub number: Option<u32>,
	#[serde(alias = "Web")]
	pub web: Option<String>,
	#[serde(alias = "Summary")]
	pub summary: Option<String>,
	#[serde(alias = "Publisher")]
	pub publisher: Option<String>,
	#[serde(alias = "Genre")]
	pub genre: Option<String>,
	#[serde(alias = "PageCount")]
	pub page_count: Option<u32>,
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

pub fn process_metadata(contents: String) -> Option<Metadata> {
	if contents.is_empty() {
		return None;
	}

	match serde_xml_rs::from_str(&contents) {
		Ok(meta) => Some(meta),
		_ => None,
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
