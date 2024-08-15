use std::{
	collections::HashMap,
	fs::File,
	io::BufReader,
	path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::{
	config::StumpConfig,
	db::entity::{LibraryOptions, MediaMetadata, SeriesMetadata},
	filesystem::{
		content_type::ContentType, epub::EpubProcessor, error::FileError,
		image::ImageFormat, pdf::PdfProcessor,
	},
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
	/// Get the sample size for a file. This is used for generating a hash of the file.
	fn get_sample_size(path: &str) -> Result<u64, FileError>;

	/// Generate a hash of the file. In most cases, the hash is generated from select pages
	/// of the file, rather than the entire file. This is to prevent the hash from changing
	/// when the metadata of the file changes.
	fn hash(path: &str) -> Option<String>;

	/// Process a file. Should gather the basic metadata and information required for
	/// processing the file.
	fn process(
		path: &str,
		options: FileProcessorOptions,
		config: &StumpConfig,
	) -> Result<ProcessedFile, FileError>;

	/// Get the bytes of a page of the file.
	fn get_page(
		path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError>;

	/// Get the number of pages in the file.
	fn get_page_count(path: &str, config: &StumpConfig) -> Result<i32, FileError>;

	/// Get the content types of a list of pages of the file. This should determine content
	/// types by actually testing the bytes for each page.
	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError>;
}

/// Trait defining a standard API for converting files throughout Stump.
pub trait FileConverter {
	fn to_zip(
		path: &str,
		delete_source: bool,
		image_format: Option<ImageFormat>,
		config: &StumpConfig,
	) -> Result<PathBuf, FileError>;
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SeriesJson {
	pub version: Option<String>,
	pub metadata: SeriesMetadata,
}

impl SeriesJson {
	pub fn from_file(path: &Path) -> Result<SeriesJson, FileError> {
		let file = File::open(path)?;
		let reader = BufReader::new(file);
		let series_json: SeriesJson = serde_json::from_reader(reader)?;
		Ok(series_json)
	}

	pub fn from_folder(folder: &Path) -> Result<SeriesJson, FileError> {
		let series_json_path = folder.join("series.json");
		SeriesJson::from_file(&series_json_path)
	}
}

/// Struct representing a processed file. This is the output of the `process` function
/// on a `FileProcessor` implementation.
#[derive(Debug)]
pub struct ProcessedFile {
	pub path: PathBuf,
	pub hash: Option<String>,
	pub metadata: Option<MediaMetadata>,
	pub pages: i32,
}

pub fn process(
	path: &Path,
	options: FileProcessorOptions,
	config: &StumpConfig,
) -> Result<ProcessedFile, FileError> {
	debug!(?path, ?options, "Processing entry");
	let mime = ContentType::from_path(path).mime_type();

	let path_str = path.to_str().unwrap_or_default();

	match mime.as_str() {
		"application/zip" | "application/vnd.comicbook+zip" => {
			ZipProcessor::process(path_str, options, config)
		},
		"application/vnd.rar" | "application/vnd.comicbook-rar" => {
			RarProcessor::process(path_str, options, config)
		},
		"application/epub+zip" => EpubProcessor::process(path_str, options, config),
		"application/pdf" => PdfProcessor::process(path_str, options, config),
		_ => Err(FileError::UnsupportedFileType(path.display().to_string())),
	}
}

pub fn get_page(
	path: &str,
	page: i32,
	config: &StumpConfig,
) -> Result<(ContentType, Vec<u8>), FileError> {
	let mime = ContentType::from_file(path).mime_type();

	match mime.as_str() {
		"application/zip" | "application/vnd.comicbook+zip" => {
			ZipProcessor::get_page(path, page, config)
		},
		"application/vnd.rar" | "application/vnd.comicbook-rar" => {
			RarProcessor::get_page(path, page, config)
		},
		"application/epub+zip" => EpubProcessor::get_page(path, page, config),
		"application/pdf" => PdfProcessor::get_page(path, page, config),
		_ => Err(FileError::UnsupportedFileType(path.to_string())),
	}
}

pub fn get_page_count(path: &str, config: &StumpConfig) -> Result<i32, FileError> {
	let mime = ContentType::from_file(path).mime_type();

	match mime.as_str() {
		"application/zip" | "application/vnd.comicbook+zip" => {
			ZipProcessor::get_page_count(path, config)
		},
		"application/vnd.rar" | "application/vnd.comicbook-rar" => {
			RarProcessor::get_page_count(path, config)
		},
		"application/epub+zip" => EpubProcessor::get_page_count(path, config),
		"application/pdf" => PdfProcessor::get_page_count(path, config),
		_ => Err(FileError::UnsupportedFileType(path.to_string())),
	}
}

pub fn get_content_types_for_pages(
	path: &str,
	pages: Vec<i32>,
) -> Result<HashMap<i32, ContentType>, FileError> {
	let mime = ContentType::from_file(path).mime_type();

	match mime.as_str() {
		"application/zip" | "application/vnd.comicbook+zip" => {
			ZipProcessor::get_page_content_types(path, pages)
		},
		"application/vnd.rar" | "application/vnd.comicbook-rar" => {
			RarProcessor::get_page_content_types(path, pages)
		},
		"application/epub+zip" => EpubProcessor::get_page_content_types(path, pages),
		_ => Err(FileError::UnsupportedFileType(path.to_string())),
	}
}

/// Get the content type for a specific page of a file.
///
/// # Arguments
/// * `path` - The path to the file
/// * `page` - The page number to get the content type for, 1-indexed
pub fn get_content_type_for_page(
	path: &str,
	page: i32,
) -> Result<ContentType, FileError> {
	let mime = ContentType::from_file(path).mime_type();

	let result = match mime.as_str() {
		"application/zip" | "application/vnd.comicbook+zip" => {
			ZipProcessor::get_page_content_types(path, [page].to_vec())
		},
		"application/vnd.rar" | "application/vnd.comicbook-rar" => {
			RarProcessor::get_page_content_types(path, [page].to_vec())
		},
		"application/epub+zip" => {
			EpubProcessor::get_page_content_types(path, [page].to_vec())
		},
		_ => return Err(FileError::UnsupportedFileType(path.to_string())),
	}?;

	Ok(result.get(&page).cloned().unwrap_or(ContentType::UNKNOWN))
}
