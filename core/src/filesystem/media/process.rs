use std::{
	collections::HashMap,
	fs::File,
	io::BufReader,
	path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tokio::{sync::oneshot, task::spawn_blocking};
use tracing::debug;

use crate::{
	config::StumpConfig,
	db::entity::{LibraryConfig, MediaMetadata, SeriesMetadata},
	filesystem::{
		content_type::ContentType, epub::EpubProcessor, error::FileError,
		image::ImageFormat, pdf::PdfProcessor,
	},
};

use super::{rar::RarProcessor, zip::ZipProcessor};

/// A struct representing the options for processing a file. This is a subset of [`LibraryConfig`]
/// and is used to pass options to the [`FileProcessor`] implementations.
#[derive(Debug, Default)]
pub struct FileProcessorOptions {
	/// Whether to convert RAR files to ZIP files after processing
	pub convert_rar_to_zip: bool,
	/// Whether to delete the source file after converting it, if [FileProcessorOptions::convert_rar_to_zip] is true
	pub delete_conversion_source: bool,
	/// Whether to generate a file hash for the file
	pub generate_file_hashes: bool,
	/// Whether to process metadata for the file
	pub process_metadata: bool,
	/// Whether to generate a hash for the file that is compatible with KOReader
	pub generate_koreader_hashes: bool,
}

impl From<LibraryConfig> for FileProcessorOptions {
	fn from(options: LibraryConfig) -> Self {
		Self {
			convert_rar_to_zip: options.convert_rar_to_zip,
			delete_conversion_source: options.hard_delete_conversions,
			generate_file_hashes: options.generate_file_hashes,
			generate_koreader_hashes: options.generate_koreader_hashes,
			process_metadata: options.process_metadata,
		}
	}
}

impl From<&LibraryConfig> for FileProcessorOptions {
	fn from(options: &LibraryConfig) -> Self {
		Self {
			convert_rar_to_zip: options.convert_rar_to_zip,
			delete_conversion_source: options.hard_delete_conversions,
			generate_file_hashes: options.generate_file_hashes,
			generate_koreader_hashes: options.generate_koreader_hashes,
			process_metadata: options.process_metadata,
		}
	}
}

// TODO(perf): Implement generic hasher which just takes X bytes from the file (and async version)
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
	pub koreader_hash: Option<String>,
	pub metadata: Option<MediaMetadata>,
	pub pages: i32,
}

/// A function to process a file in a blocking manner. This will call the appropriate
/// [`FileProcessor::process`] implementation based on the file's mime type, or return an
/// error if the file type is not supported.
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

/// A function to process a file in the context of a spawned, blocking task. This will call the
/// [process] function and send the result back out through a oneshot channel.
#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn process_async(
	path: impl AsRef<Path>,
	options: FileProcessorOptions,
	config: &StumpConfig,
) -> Result<ProcessedFile, FileError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let path = path.as_ref().to_path_buf();
		let config = config.clone();

		move || {
			let send_result = tx.send(process(path.as_path(), options, &config));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of sync process"
			);
		}
	});

	let processed_file = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| FileError::UnknownError(e.to_string()))?;
		return Err(FileError::UnknownError(
			"Failed to receive processed file".to_string(),
		));
	};

	Ok(processed_file)
}

/// A function to extract the bytes of a page from a file in a blocking manner. This will call the
/// appropriate [`FileProcessor::get_page`] implementation based on the file's mime type, or return an
/// error if the file type is not supported.
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

/// A function to extract the bytes of a page from a file in the context of a spawned, blocking task.
/// This will call the [get_page] function and send the result back out through a oneshot channel.
#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_page_async(
	path: impl AsRef<Path>,
	page: i32,
	config: &StumpConfig,
) -> Result<(ContentType, Vec<u8>), FileError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let path = path.as_ref().to_path_buf();
		let config = config.clone();

		move || {
			let send_result =
				tx.send(get_page(path.to_str().unwrap_or_default(), page, &config));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of sync get_page"
			);
		}
	});

	let page_result = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| FileError::UnknownError(e.to_string()))?;
		return Err(FileError::UnknownError(
			"Failed to receive page content".to_string(),
		));
	};

	Ok(page_result)
}

/// Get the number of pages in a file. This will call the appropriate [`FileProcessor::get_page_count`]
/// implementation based on the file's mime type, or return an error if the file type is not supported.
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

/// Get the number of pages in a file in the context of a spawned, blocking task. This will call the
/// [get_page_count] function and send the result back out through a oneshot channel.
#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_page_count_async(
	path: impl AsRef<Path>,
	config: &StumpConfig,
) -> Result<i32, FileError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let path = path.as_ref().to_path_buf();
		let config = config.clone();

		move || {
			let send_result =
				tx.send(get_page_count(path.to_str().unwrap_or_default(), &config));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of sync get_page_count"
			);
		}
	});

	let page_count = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| FileError::UnknownError(e.to_string()))?;
		return Err(FileError::UnknownError(
			"Failed to receive page count".to_string(),
		));
	};

	Ok(page_count)
}

/// Get the content types of a list of pages of a file. This will call the appropriate
/// [`FileProcessor::get_page_content_types`] implementation based on the file's mime type, or return an
/// error if the file type is not supported.
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
		"application/pdf" => PdfProcessor::get_page_content_types(path, pages),
		_ => Err(FileError::UnsupportedFileType(path.to_string())),
	}
}

/// Get the content type for a specific page of a file.
///
/// # Arguments
/// * `path` - The path to the file
/// * `page` - The page number to get the content type for, 1-indexed
fn get_content_type_for_page_sync(
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
		"application/pdf" => PdfProcessor::get_page_content_types(path, [page].to_vec()),
		_ => return Err(FileError::UnsupportedFileType(path.to_string())),
	}?;

	Ok(result.get(&page).cloned().unwrap_or(ContentType::UNKNOWN))
}

/// Get the content type for a specific page of a file in the context of a spawned, blocking task.
/// This will call the [get_content_type_for_page_sync] function and send the result back out through
/// a oneshot channel.
#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_content_type_for_page(
	path: impl AsRef<Path>,
	page: i32,
) -> Result<ContentType, FileError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let path = path.as_ref().to_path_buf();

		move || {
			let send_result = tx.send(get_content_type_for_page_sync(
				path.to_str().unwrap_or_default(),
				page,
			));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of sync get_content_type_for_page"
			);
		}
	});

	let content_type = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| FileError::UnknownError(e.to_string()))?;
		return Err(FileError::UnknownError(
			"Failed to receive content type for page".to_string(),
		));
	};

	Ok(content_type)
}
