use std::{collections::HashMap, path::Path};

use crate::{fs_utils::ContentType, media::processor::error::MediaProcessorError};

pub mod error;
mod zip;

/// A struct representing the options for processing a media file. This is a subset of [`LibraryConfig`]
/// and is used to pass options to the [`MediaProcessor`] implementations.
#[derive(Debug, Default, Clone, Copy)]
pub struct MediaProcessorOptions {
	/// Whether to convert RAR files to ZIP files after processing
	pub convert_rar_to_zip: bool,
	/// Whether to delete the source file after converting it, if [MediaProcessorOptions::convert_rar_to_zip] is true
	pub delete_conversion_source: bool,
	/// Whether to generate a file hash for the file
	pub generate_file_hashes: bool,
	/// Whether to process metadata for the file
	pub process_metadata: bool,
	/// Whether to generate a hash for the file that is compatible with KOReader
	pub generate_koreader_hashes: bool,
}
// TODO: ^ take more from stump config?

#[derive(Debug, Clone, Default)]
pub struct GeneratedFileHashes {
	pub stump: Option<String>,
	pub koreader: Option<String>,
}

/// A trait that defines the methods required for processing media files. Every
/// supported content type should implement this trait.
///
/// Note: This is a synchronous trait since media processing is largely dependent on
/// librararies (e.g., zip, unrar, etc) that are synchronous. The majority of surfaces in
/// Stump, however, are async. So it is important that you do not use these processors
/// directly unless you wrap them in a blocking thread
pub trait MediaProcessor {
	/// Take a sample of the file to be used for generating a hash
	fn sample(path: &Path) -> Result<Vec<u8>, MediaProcessorError>;

	/// Generate a Stump-specific hash of the file, used for deduplication efforts
	fn generate_stump_hash(path: &Path) -> Result<String, MediaProcessorError>;

	/// Generate both a Stump hash and a KoReader hash of the file, depending on
	/// the options provided
	fn generate_hashes(
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<GeneratedFileHashes, MediaProcessorError>;

	/// Process the metadata of a file, if any
	fn process_metadata(
		path: &Path,
		// TODO: sort that out
		// ) -> Result<Option<ProcessedMediaMetadata>, MediaProcessorError>;
	) -> Result<Option<()>, MediaProcessorError>;

	/// Process a media file at the given path, with the provided options
	fn process(
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<(), MediaProcessorError>;

	/// Get the bytes of a page within a media file, assuming the file is an indexed format
	/// like a PDF or CBZ
	fn get_page(
		path: &str,
		page: i32,
		// config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), MediaProcessorError>;

	/// Get the number of pages in a media file, assuming the file is an indexed format
	/// like a PDF or CBZ
	fn get_page_count(path: &str) -> Result<i32, MediaProcessorError>;

	/// Get the content types of a list of pages of the file. This should determine content
	/// types by actually testing the bytes for each page.
	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, MediaProcessorError>;

	// Analyze a page to get its dimensions and content type. This is optimized to read
	// only the minimum bytes necessary to determine the image dimensions
	// fn analyze_page(
	// 	path: &str,
	// 	page: i32,
	// 	// config: &StumpConfig,
	// ) -> Result<AnalyzedPage, MediaProcessorError>;
}

// pub trait FileProcessor {
// 	/// Get the sample size for a file. This is used for generating a hash of the file.
// 	fn get_sample_size(path: &str) -> Result<u64, FileError>;

// 	/// Generate a hash of the file. In most cases, the hash is generated from select pages
// 	/// of the file, rather than the entire file. This is to prevent the hash from changing
// 	/// when the metadata of the file changes.
// 	fn generate_stump_hash(path: &str) -> Option<String>;

// 	/// Generate both hashes for a file, depending on the options provided.
// 	fn generate_hashes(
// 		path: &str,
// 		options: FileProcessorOptions,
// 	) -> Result<ProcessedFileHashes, FileError>;

// 	/// Process a file. Should gather the basic metadata and information required for
// 	/// processing the file.
// 	fn process(
// 		path: &str,
// 		options: FileProcessorOptions,
// 		config: &StumpConfig,
// 	) -> Result<ProcessedFile, FileError>;

// 	/// Process the metadata of a file. This should gather the metadata of the file
// 	/// without processing the entire file.
// 	fn process_metadata(path: &str) -> Result<Option<ProcessedMediaMetadata>, FileError>;

// 	/// Get the bytes of a page of the file.
// 	fn get_page(
// 		path: &str,
// 		page: i32,
// 		config: &StumpConfig,
// 	) -> Result<(ContentType, Vec<u8>), FileError>;

// 	/// Get the number of pages in the file.
// 	fn get_page_count(path: &str, config: &StumpConfig) -> Result<i32, FileError>;

// 	/// Get the content types of a list of pages of the file. This should determine content
// 	/// types by actually testing the bytes for each page.
// 	fn get_page_content_types(
// 		path: &str,
// 		pages: Vec<i32>,
// 	) -> Result<HashMap<i32, ContentType>, FileError>;

// 	/// Analyze a page to get its dimensions and content type. This is optimized to read
// 	/// only the minimum bytes necessary to determine the image dimensions
// 	fn analyze_page(
// 		path: &str,
// 		page: i32,
// 		config: &StumpConfig,
// 	) -> Result<AnalyzedPage, FileError>;
// }
