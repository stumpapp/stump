use std::{
	collections::HashMap,
	path::{Path, PathBuf},
};

use tokio::task::spawn_blocking;

use crate::{
	config::StumpConfig,
	fs_utils::{ContentType, FileParts, PathUtils},
	media::{
		metadata::ProcessedMediaMetadata,
		processor::{
			error::MediaProcessorError, pdf::PdfProcessor, rar::RarProcessor,
			zip::ZipProcessor,
		},
	},
};

pub mod error;
mod pdf;
mod rar;
mod zip;

/// A struct representing the dimensions and content type of a single analyzed page
#[derive(Debug, Clone)]
pub struct AnalyzedPage {
	pub width: u32,
	pub height: u32,
	pub content_type: ContentType,
}

/// A struct representing the options for processing a media file. This is a subset of [`LibraryConfig`]
/// and is used to pass options to the [`MediaProcessor`] implementations.
#[derive(Debug, Default, Clone)]
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
	/// The directory to use whenever a temporary file is needed, e.g. when converting
	/// a RAR file to a ZIP
	pub cache_directory: PathBuf,
}
// TODO: ^ take more from stump config?

#[derive(Debug, Clone, Default)]
pub struct GeneratedFileHashes {
	pub stump: Option<String>,
	pub koreader: Option<String>,
}

/// Struct representing a processed file. This is the output of the `process` function
/// on a `FileProcessor` implementation.
#[derive(Debug)]
pub struct ProcessedMediaFile {
	pub path: PathBuf,
	pub hash: Option<String>,
	pub koreader_hash: Option<String>,
	pub metadata: Option<ProcessedMediaMetadata>,
	pub pages: i32,
}

/// A trait that defines the methods required for processing media files. Every
/// supported content type should implement this trait.
///
/// Note: This is a synchronous trait since media processing is largely dependent on
/// librararies (e.g., zip, unrar, etc) that are synchronous. The majority of surfaces in
/// Stump, however, are async. So it is important that you do not use these processors
/// directly unless you wrap them in a blocking thread
pub trait MediaProcessor {
	/// Generate a Stump-specific hash of the file, used for deduplication efforts
	fn generate_stump_hash(&self, path: &Path) -> Result<String, MediaProcessorError>;

	/// Generate both a Stump hash and a KoReader hash of the file, depending on
	/// the options provided
	fn generate_hashes(
		&self,
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<GeneratedFileHashes, MediaProcessorError>;

	/// Process the metadata of a file, if any
	fn process_metadata(
		&self,
		path: &Path,
	) -> Result<Option<ProcessedMediaMetadata>, MediaProcessorError>;

	/// Process a media file at the given path, with the provided options
	fn process(
		&self,
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<ProcessedMediaFile, MediaProcessorError>;

	/// Get the bytes of a page within a media file, assuming the file is an indexed format
	/// like a PDF or CBZ
	fn get_page(
		&self,
		path: &Path,
		page: i32,
	) -> Result<(ContentType, Vec<u8>), MediaProcessorError>;

	/// Get the number of pages in a media file, assuming the file is an indexed format
	/// like a PDF or CBZ
	fn get_page_count(&self, path: &Path) -> Result<i32, MediaProcessorError>;

	/// Get the content types of a list of pages of the file. This should determine content
	/// types by actually testing the bytes for each page.
	fn get_page_content_types(
		&self,
		path: &Path,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, MediaProcessorError>;

	/// Analyze a page to get its dimensions and content type. This is optimized to read
	/// only the minimum bytes necessary to determine the image dimensions from its header.
	fn analyze_page(
		&self,
		path: &Path,
		page: i32,
	) -> Result<AnalyzedPage, MediaProcessorError>;
}

async fn get_processor(
	path: &Path,
	config: &StumpConfig,
) -> Result<Box<dyn MediaProcessor + Send>, MediaProcessorError> {
	let mime = ContentType::from_path_async(path).await.mime_type();
	let FileParts { extension, .. } = path.file_parts();

	tracing::debug!(
		?path,
		?mime,
		?extension,
		"Determining processor type for entry"
	);

	match (mime.as_str(), extension.to_lowercase().as_str()) {
		("application/zip" | "application/vnd.comicbook+zip", ext) if ext != "epub" => {
			Ok(Box::new(ZipProcessor))
		},
		("application/vnd.rar" | "application/vnd.comicbook-rar", _) => {
			Ok(Box::new(RarProcessor))
		},
		("application/epub+zip", _) => {
			todo!()
			// Ok(ProcessorType::Epub)
		},
		("application/zip", "epub") => {
			todo!()
			// Ok(ProcessorType::Epub)
		},
		("application/pdf", _) => Ok(Box::new(PdfProcessor::new(config.clone()))),
		_ => Err(MediaProcessorError::UnsupportedFile(
			path.display().to_string(),
		)),
	}
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn process_file(
	path: impl AsRef<Path>,
	options: MediaProcessorOptions,
	config: &StumpConfig,
) -> Result<ProcessedMediaFile, MediaProcessorError> {
	let path = path.as_ref().to_path_buf();
	let processor = get_processor(&path, config).await?;
	spawn_blocking(move || processor.process(&path, options)).await?
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn process_metadata(
	path: impl AsRef<Path>,
	config: &StumpConfig,
) -> Result<Option<ProcessedMediaMetadata>, MediaProcessorError> {
	let path = path.as_ref().to_path_buf();
	let processor = get_processor(&path, config).await?;
	spawn_blocking(move || processor.process_metadata(&path)).await?
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn generate_hashes(
	path: impl AsRef<Path>,
	options: MediaProcessorOptions,
	config: &StumpConfig,
) -> Result<GeneratedFileHashes, MediaProcessorError> {
	let path = path.as_ref().to_path_buf();
	let processor = get_processor(&path, config).await?;
	spawn_blocking(move || processor.generate_hashes(&path, options)).await?
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_page(
	path: impl AsRef<Path>,
	page: i32,
	config: &StumpConfig,
) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
	let path = path.as_ref().to_path_buf();

	let mime = ContentType::from_extension(
		path.extension().and_then(|ext| ext.to_str()).unwrap_or(""),
	)
	.mime_type();
	// pdf is a special case and has a lot of optimizations in place since pages are
	// rendered on demand, so for get_page we flow through those to get things like
	// caching etc.
	if mime == "application/pdf" {
		return pdf::get_page_async(&path, page, config).await;
	}

	let processor = get_processor(&path, config).await?;
	spawn_blocking(move || processor.get_page(&path, page)).await?
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_page_count(
	path: impl AsRef<Path>,
	config: &StumpConfig,
) -> Result<i32, MediaProcessorError> {
	let path = path.as_ref().to_path_buf();
	let processor = get_processor(&path, config).await?;
	spawn_blocking(move || processor.get_page_count(&path)).await?
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_content_types_for_pages(
	path: impl AsRef<Path>,
	pages: Vec<i32>,
	config: &StumpConfig,
) -> Result<HashMap<i32, ContentType>, MediaProcessorError> {
	let path = path.as_ref().to_path_buf();
	let processor = get_processor(&path, config).await?;
	spawn_blocking(move || processor.get_page_content_types(&path, pages)).await?
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn get_content_type_for_page(
	path: impl AsRef<Path>,
	page: i32,
	config: &StumpConfig,
) -> Result<ContentType, MediaProcessorError> {
	let path = path.as_ref().to_path_buf();
	let processor = get_processor(&path, config).await?;
	let content_types =
		spawn_blocking(move || processor.get_page_content_types(&path, vec![page]))
			.await??;
	Ok(content_types
		.get(&page)
		.cloned()
		.unwrap_or(ContentType::UNKNOWN))
}

#[tracing::instrument(err, fields(path = %path.as_ref().display()))]
pub async fn analyze_page(
	path: impl AsRef<Path>,
	page: i32,
	config: &StumpConfig,
) -> Result<AnalyzedPage, MediaProcessorError> {
	let path = path.as_ref().to_path_buf();
	let processor = get_processor(&path, config).await?;
	spawn_blocking(move || processor.analyze_page(&path, page)).await?
}

#[cfg(test)]
mod tests {
	use super::*;

	// TODO: other tests, lots of the get_processor tests from before are
	// not applicable anymore since i removed the enum and made the trait
	// use self

	#[tokio::test]
	async fn test_get_processor_unsupported() {
		let path = Path::new("/fake/path/to/file.txt");
		let config = StumpConfig::debug();
		let error = match get_processor(path, &config).await {
			Ok(_) => panic!("Expected error, got Ok"), // MediaProcessor does not impl Debug, so no unwrap_err() >:(
			Err(e) => e,
		};
		assert!(matches!(error, MediaProcessorError::UnsupportedFile(_)));
	}
}
