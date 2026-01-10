use std::{
	collections::HashMap,
	path::{Path, PathBuf},
};

use models::{
	entity::library_config, shared::image_processor_options::SupportedImageFormat,
};
use tokio::{sync::oneshot, task::spawn_blocking};

use crate::{
	config::StumpConfig,
	filesystem::{
		content_type::ContentType,
		error::FileError,
		media::{epub::EpubProcessor, pdf::PdfProcessor},
		FileParts, PathUtils,
	},
};

use super::{metadata::ProcessedMediaMetadata, rar::RarProcessor, zip::ZipProcessor};

/// A struct representing the options for processing a file. This is a subset of [`LibraryConfig`]
/// and is used to pass options to the [`FileProcessor`] implementations.
#[derive(Debug, Default, Clone, Copy)]
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

impl From<library_config::Model> for FileProcessorOptions {
	fn from(options: library_config::Model) -> Self {
		Self {
			convert_rar_to_zip: options.convert_rar_to_zip,
			delete_conversion_source: options.hard_delete_conversions,
			generate_file_hashes: options.generate_file_hashes,
			generate_koreader_hashes: options.generate_koreader_hashes,
			process_metadata: options.process_metadata,
		}
	}
}

impl From<&library_config::Model> for FileProcessorOptions {
	fn from(options: &library_config::Model) -> Self {
		Self {
			convert_rar_to_zip: options.convert_rar_to_zip,
			delete_conversion_source: options.hard_delete_conversions,
			generate_file_hashes: options.generate_file_hashes,
			generate_koreader_hashes: options.generate_koreader_hashes,
			process_metadata: options.process_metadata,
		}
	}
}

#[derive(Debug, Clone, Default)]
pub struct ProcessedFileHashes {
	pub hash: Option<String>,
	pub koreader_hash: Option<String>,
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
	fn generate_stump_hash(path: &str) -> Option<String>;

	/// Generate both hashes for a file, depending on the options provided.
	fn generate_hashes(
		path: &str,
		options: FileProcessorOptions,
	) -> Result<ProcessedFileHashes, FileError>;

	/// Process a file. Should gather the basic metadata and information required for
	/// processing the file.
	fn process(
		path: &str,
		options: FileProcessorOptions,
		config: &StumpConfig,
	) -> Result<ProcessedFile, FileError>;

	/// Process the metadata of a file. This should gather the metadata of the file
	/// without processing the entire file.
	fn process_metadata(path: &str) -> Result<Option<ProcessedMediaMetadata>, FileError>;

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
		image_format: Option<SupportedImageFormat>,
		config: &StumpConfig,
	) -> Result<PathBuf, FileError>;
}

/// Struct representing a processed file. This is the output of the `process` function
/// on a `FileProcessor` implementation.
#[derive(Debug)]
pub struct ProcessedFile {
	pub path: PathBuf,
	pub hash: Option<String>,
	pub koreader_hash: Option<String>,
	pub metadata: Option<ProcessedMediaMetadata>,
	pub pages: i32,
}

#[derive(Debug)]
enum ProcessorType {
	Zip,
	Rar,
	Epub,
	Pdf,
}

fn determine_processor(path: &Path) -> Result<ProcessorType, FileError> {
	let mime = ContentType::from_path(path).mime_type();
	let FileParts { extension, .. } = path.file_parts();

	tracing::debug!(
		?path,
		?mime,
		?extension,
		"Determining processor type for entry"
	);

	match (mime.as_str(), extension.to_lowercase().as_str()) {
		("application/zip" | "application/vnd.comicbook+zip", ext) if ext != "epub" => {
			Ok(ProcessorType::Zip)
		},
		("application/vnd.rar" | "application/vnd.comicbook-rar", _) => {
			Ok(ProcessorType::Rar)
		},
		("application/epub+zip", _) => Ok(ProcessorType::Epub),
		("application/zip", "epub") => Ok(ProcessorType::Epub),
		("application/pdf", _) => Ok(ProcessorType::Pdf),
		_ => Err(FileError::UnsupportedFileType(path.display().to_string())),
	}
}

/// A macro to dispatch a method call to the appropriate `FileProcessor` implementation
/// based on the file's mime type. This macro is used to reduce boilerplate code in
/// the functions below, which all follow the same pattern for determining which processor
/// to use for the given path
macro_rules! dispatch_processor {
    ($path:expr, $method:ident $(, $arg:expr)*) => {{
        let processor_type = determine_processor($path.as_ref())?;
        match processor_type {
            ProcessorType::Zip => ZipProcessor::$method($($arg),*),
            ProcessorType::Rar => RarProcessor::$method($($arg),*),
            ProcessorType::Epub => EpubProcessor::$method($($arg),*),
            ProcessorType::Pdf => PdfProcessor::$method($($arg),*),
        }
    }};
}

/// A function to process a file in a blocking manner. This will call the appropriate
/// [`FileProcessor::process`] implementation based on the file's mime type, or return an
/// error if the file type is not supported.
pub fn process(
	path: &Path,
	options: FileProcessorOptions,
	config: &StumpConfig,
) -> Result<ProcessedFile, FileError> {
	let path_str = path.to_str().unwrap_or_default();
	dispatch_processor!(path, process, path_str, options, config)
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

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub fn process_metadata(
	path: impl AsRef<Path>,
) -> Result<Option<ProcessedMediaMetadata>, FileError> {
	let path_str = path.as_ref().to_str().unwrap_or_default();
	dispatch_processor!(path, process_metadata, path_str)
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn process_metadata_async(
	path: impl AsRef<Path>,
) -> Result<Option<ProcessedMediaMetadata>, FileError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let path = path.as_ref().to_path_buf();

		move || {
			let send_result = tx.send(process_metadata(path.as_path()));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of sync process_metadata"
			);
		}
	});

	let metadata = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| FileError::UnknownError(e.to_string()))?;
		return Err(FileError::UnknownError(
			"Failed to receive metadata".to_string(),
		));
	};

	Ok(metadata)
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub fn generate_hashes(
	path: impl AsRef<Path>,
	options: FileProcessorOptions,
) -> Result<ProcessedFileHashes, FileError> {
	let path_str = path.as_ref().to_str().unwrap_or_default();
	dispatch_processor!(path, generate_hashes, path_str, options)
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn generate_hashes_async(
	path: impl AsRef<Path>,
	options: FileProcessorOptions,
) -> Result<ProcessedFileHashes, FileError> {
	let (tx, rx) = oneshot::channel();

	let handle = spawn_blocking({
		let path = path.as_ref().to_path_buf();

		move || {
			let send_result = tx.send(generate_hashes(path.as_path(), options));
			tracing::trace!(
				is_err = send_result.is_err(),
				"Sending result of sync generate_hashes"
			);
		}
	});

	let processed_hashes = if let Ok(recv) = rx.await {
		recv?
	} else {
		handle
			.await
			.map_err(|e| FileError::UnknownError(e.to_string()))?;
		return Err(FileError::UnknownError(
			"Failed to receive processed file hashes".to_string(),
		));
	};

	Ok(processed_hashes)
}

/// A function to extract the bytes of a page from a file in a blocking manner. This will call the
/// appropriate [`FileProcessor::get_page`] implementation based on the file's mime type, or return an
/// error if the file type is not supported.
pub fn get_page(
	path: &str,
	page: i32,
	config: &StumpConfig,
) -> Result<(ContentType, Vec<u8>), FileError> {
	dispatch_processor!(Path::new(path), get_page, path, page, config)
}

/// A function to extract the bytes of a page from a file in the context of a spawned, blocking task.
/// This will call the [get_page] function and send the result back out through a oneshot channel.
/// For PDF files, it uses optimized caching and pre-rendering.
#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_page_async(
	path: impl AsRef<Path>,
	page: i32,
	config: &StumpConfig,
) -> Result<(ContentType, Vec<u8>), FileError> {
	let path_str = path.as_ref().to_str().unwrap_or_default();
	let mime = ContentType::from_file(path_str).mime_type();

	// Use optimized PDF rendering for PDF files (includes caching if enabled)
	if mime == "application/pdf" {
		return PdfProcessor::get_page_async(path_str, page, config).await;
	}

	// For other file types, use the original blocking approach
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
	dispatch_processor!(Path::new(path), get_page_count, path, config)
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
	dispatch_processor!(Path::new(path), get_page_content_types, path, pages)
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
	let result =
		dispatch_processor!(Path::new(path), get_page_content_types, path, vec![page])?;
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

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::{
		get_test_cbz_path, get_test_epub_path, get_test_pdf_path, get_test_rar_path,
		get_test_zip_path,
	};

	#[test]
	fn test_determine_processor_zip() {
		let path_str = get_test_zip_path();
		let path = Path::new(&path_str);
		let result = determine_processor(path);
		assert!(result.is_ok());
		assert!(matches!(result.unwrap(), ProcessorType::Zip));
	}

	#[test]
	fn test_determine_processor_cbz() {
		let path_str = get_test_cbz_path();
		let path = Path::new(&path_str);
		let result = determine_processor(path);
		assert!(result.is_ok());
		assert!(matches!(result.unwrap(), ProcessorType::Zip));
	}

	#[test]
	fn test_determine_processor_rar() {
		let path_str = get_test_rar_path();
		let path = Path::new(&path_str);
		let result = determine_processor(path);
		assert!(result.is_ok());
		assert!(matches!(result.unwrap(), ProcessorType::Rar));
	}

	#[test]
	fn test_determine_processor_epub() {
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);
		let result = determine_processor(path);
		assert!(result.is_ok());
		assert!(matches!(result.unwrap(), ProcessorType::Epub));
	}

	// Note: Added to assert fix for bug reported on Discord.
	// See https://discord.com/channels/972593831172272148/1428031745726484560/1428050250811183144
	#[test]
	fn test_determine_processor_epub_with_zip_mime() {
		let epub_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests/data/book-zip-mime.epub");
		let result = determine_processor(&epub_path);
		assert!(result.is_ok());
		assert!(
			matches!(result.unwrap(), ProcessorType::Epub),
			"EPUB with .epub extension should be detected as EPUB even with zip mime type"
		);
	}

	#[test]
	fn test_determine_processor_pdf() {
		let path_str = get_test_pdf_path();
		let path = Path::new(&path_str);
		let result = determine_processor(path);
		assert!(result.is_ok());
		assert!(matches!(result.unwrap(), ProcessorType::Pdf));
	}

	#[test]
	fn test_determine_processor_unsupported() {
		let path = Path::new("/fake/path/to/file.txt");
		let result = determine_processor(path);
		assert!(result.is_err());
		assert!(matches!(result, Err(FileError::UnsupportedFileType(_))));
	}
}
