use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	sync::{LazyLock, Mutex},
};
use tracing::{debug, error, warn};

use mupdf::{
	Colorspace, Document, ImageFormat as MuPdfImageFormat, Matrix, MetadataName,
};

/// Simple in-memory cache for rendered PDF pages
/// Key: (file_path, page_number, dpi), Value: PNG bytes
type PageCache = HashMap<(String, i32, u32), Vec<u8>>;
static PDF_PAGE_CACHE: LazyLock<Mutex<PageCache>> =
	LazyLock::new(|| Mutex::new(HashMap::new()));

use crate::{
	config::StumpConfig,
	db::entity::MediaMetadata,
	filesystem::{
		archive::create_zip_archive,
		error::FileError,
		hash::{self, generate_koreader_hash},
		image::{
			GenericImageProcessor, ImageFormat, ImageProcessor, ImageProcessorOptions,
			ProcessorError, WebpProcessor,
		},
		media::process::{
			FileConverter, FileProcessor, FileProcessorOptions, ProcessedFile,
		},
		ContentType, FileParts, PathUtils, ProcessedFileHashes,
	},
};

/// A file processor for PDF files.
pub struct PdfProcessor;

impl FileProcessor for PdfProcessor {
	/// Generate a sample size for hashing. PDFs are typically stable files,
	/// so we use 1/10th of the file size for efficient hashing.
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let file = std::fs::File::open(path)?;
		let metadata = file.metadata()?;
		let size = metadata.len();

		if size < 10 {
			warn!(path, size, "PDF file is too small to sample");
			return Err(FileError::PdfProcessingError(
				"PDF file is too small to sample".to_string(),
			));
		}

		Ok(size / 10)
	}

	fn generate_stump_hash(path: &str) -> Option<String> {
		let sample = Self::get_sample_size(path).ok()?;
		match hash::generate(path, sample) {
			Ok(digest) => Some(digest),
			Err(e) => {
				debug!(error = ?e, path, "Failed to digest PDF file");
				None
			},
		}
	}

	fn generate_hashes(
		path: &str,
		FileProcessorOptions {
			generate_file_hashes,
			generate_koreader_hashes,
			..
		}: FileProcessorOptions,
	) -> Result<ProcessedFileHashes, FileError> {
		let hash = generate_file_hashes
			.then(|| Self::generate_stump_hash(path))
			.flatten();
		let koreader_hash = generate_koreader_hashes
			.then(|| generate_koreader_hash(path))
			.transpose()?;

		Ok(ProcessedFileHashes {
			hash,
			koreader_hash,
		})
	}

	fn process_metadata(path: &str) -> Result<Option<MediaMetadata>, FileError> {
		let document = Document::open(path)?;

		// Extract metadata fields that are available
		let title = document.metadata(MetadataName::Title).ok();
		let author = document.metadata(MetadataName::Author).ok();
		let subject = document.metadata(MetadataName::Subject).ok();

		// Only return metadata if we found at least one field
		if title.is_some() || author.is_some() || subject.is_some() {
			Ok(Some(MediaMetadata {
				title,
				writers: author.map(|a| vec![a]),
				genre: subject.map(|s| vec![s]),
				..Default::default()
			}))
		} else {
			Ok(None)
		}
	}

	fn process(
		path: &str,
		options: FileProcessorOptions,
		_: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		let document = Document::open(path)?;

		let pages = document.page_count()? as i32;
		let metadata = Self::process_metadata(path)?;
		let ProcessedFileHashes {
			hash,
			koreader_hash,
		} = Self::generate_hashes(path, options)?;

		Ok(ProcessedFile {
			path: PathBuf::from(path),
			hash,
			koreader_hash,
			metadata,
			pages,
		})
	}

	fn get_page(
		path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let document = Document::open(path)?;
		Self::render_page(&document, path, page, config)
	}

	fn get_page_count(path: &str, _config: &StumpConfig) -> Result<i32, FileError> {
		let document = Document::open(path)?;
		Ok(document.page_count()? as i32)
	}

	fn get_page_content_types(
		_: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		// TODO: This doesn't have access to config, so it can't determine the actual format
		// For now, assume PNG. The actual format is determined at render time in get_page()
		Ok(pages
			.into_iter()
			.map(|page| (page, ContentType::PNG))
			.collect())
	}
}

impl PdfProcessor {
	/// Convert PNG bytes to the configured output format
	fn convert_to_output_format(
		png_data: &[u8],
		target_format: &ImageFormat,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		match target_format {
			ImageFormat::Png => Ok((ContentType::PNG, png_data.to_vec())),
			ImageFormat::Webp => {
				let webp_data = WebpProcessor::generate(
					png_data,
					ImageProcessorOptions {
						format: ImageFormat::Webp,
						..Default::default()
					},
				)
				.map_err(|e| match e {
					ProcessorError::FileError(fe) => fe,
					_ => FileError::UnknownError(e.to_string()),
				})?;
				Ok((ContentType::WEBP, webp_data))
			},
			ImageFormat::Jpeg => {
				let jpeg_data = GenericImageProcessor::generate(
					png_data,
					ImageProcessorOptions {
						format: ImageFormat::Jpeg,
						..Default::default()
					},
				)
				.map_err(|e| match e {
					ProcessorError::FileError(fe) => fe,
					_ => FileError::UnknownError(e.to_string()),
				})?;
				Ok((ContentType::JPEG, jpeg_data))
			},
		}
	}

	/// Parse the configured image format or default to PNG
	fn get_target_format(config: &StumpConfig) -> ImageFormat {
		match config.pdf_image_format.to_lowercase().as_str() {
			"webp" => ImageFormat::Webp,
			"jpeg" | "jpg" => ImageFormat::Jpeg,
			_ => ImageFormat::Png, // Default to PNG
		}
	}

	/// Render a PDF page with format conversion and caching.
	fn render_page(
		document: &Document,
		path: &str,
		page_num: i32,
		config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let target_format = Self::get_target_format(config);
		let png_data = Self::render_page_to_png(document, path, page_num, config)?;
		Self::convert_to_output_format(&png_data, &target_format)
	}

	/// Render a PDF page to a PNG buffer using the given configuration with caching.
	fn render_page_to_png(
		document: &Document,
		path: &str,
		page_num: i32,
		config: &StumpConfig,
	) -> Result<Vec<u8>, FileError> {
		let dpi = config.pdf_render_dpi as u32;
		let cache_key = (path.to_string(), page_num, dpi);

		// Check cache first
		if let Ok(cache) = PDF_PAGE_CACHE.lock() {
			if let Some(cached_data) = cache.get(&cache_key) {
				debug!("Cache hit for PDF page: {} page {}", path, page_num);
				return Ok(cached_data.clone());
			}
		}

		debug!(
			"Rendering PDF page: {} page {} at {}dpi",
			path, page_num, dpi
		);

		// Render the page
		let page_obj = document.load_page(page_num - 1)?;
		let scale = config.pdf_render_dpi / 72.0;
		let matrix = Matrix::new_scale(scale, scale);
		let colorspace = Colorspace::device_rgb();
		let pixmap = page_obj.to_pixmap(&matrix, &colorspace, false, false)?;

		let mut buffer = Vec::new();
		pixmap.write_to(&mut buffer, MuPdfImageFormat::PNG)?;

		// Store in cache
		if let Ok(mut cache) = PDF_PAGE_CACHE.lock() {
			// Limit cache size to prevent memory issues (e.g., 100 pages max)
			if cache.len() >= 100 {
				// Simple eviction: clear oldest entries
				cache.clear();
				debug!("PDF page cache cleared (reached limit)");
			}
			cache.insert(cache_key, buffer.clone());
		}

		Ok(buffer)
	}
}

impl FileConverter for PdfProcessor {
	fn to_zip(
		path: &str,
		delete_source: bool,
		format: Option<ImageFormat>,
		config: &StumpConfig,
	) -> Result<PathBuf, FileError> {
		let document = Document::open(path)?;
		let page_count = document.page_count()?;

		// Use the provided format or default to config format
		let target_format = format.unwrap_or_else(|| Self::get_target_format(config));

		let mut converted_pages = Vec::new();
		for page_num in 0..page_count {
			let page_index = (page_num + 1) as i32; // Convert to 1-based indexing
			match Self::render_page_to_png(&document, path, page_index, config) {
				Ok(png_data) => {
					// Convert PNG to target format for ZIP conversion
					match Self::convert_to_output_format(&png_data, &target_format) {
						Ok((_, image_data)) => {
							if !image_data.is_empty() {
								converted_pages.push(image_data);
							}
						},
						Err(e) => {
							warn!(error = ?e, page = page_index, "Failed to convert PDF page format");
						},
					}
				},
				Err(e) => {
					warn!(error = ?e, page = page_index, "Failed to render PDF page");
				},
			}
		}

		let path_buf = PathBuf::from(path);
		let parent = path_buf.parent().unwrap_or_else(|| Path::new("/"));
		let FileParts {
			file_name,
			file_stem,
			extension,
		} = path_buf.as_path().file_parts();

		let cache_dir = config.get_cache_dir();
		let unpacked_path = cache_dir.join(&file_stem);

		// create folder for the zip
		std::fs::create_dir_all(&unpacked_path)?;

		// write each image to the folder
		for (idx, image_buf) in converted_pages.into_iter().enumerate() {
			// write the image to file with proper extension
			let output_extension = target_format.extension();

			let image_path = unpacked_path
				.join(format!("{file_stem}_{:04}.{output_extension}", idx + 1));

			if let Err(err) = std::fs::write(image_path, image_buf) {
				error!(error = ?err, "Failed to write image to file");
			}
		}

		let zip_path =
			create_zip_archive(&unpacked_path, &file_name, &extension, parent)?;

		// Clean up source file if requested
		if delete_source {
			if let Err(err) = trash::delete(path) {
				error!(error = ?err, path, "Failed to delete converted PDF source file");
			}
		}

		// Clean up temporary directory
		if let Err(err) = std::fs::remove_dir_all(&unpacked_path) {
			error!(
				error = ?err, ?cache_dir, ?unpacked_path,
				"Failed to delete unpacked contents in cache"
			);
		}

		Ok(zip_path)
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::get_test_pdf_path;

	#[test]
	fn test_process() {
		let path = get_test_pdf_path();
		let config = StumpConfig::debug();

		let processed_file = PdfProcessor::process(
			&path,
			FileProcessorOptions {
				convert_rar_to_zip: false,
				delete_conversion_source: false,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
	}

	#[test]
	fn test_get_page_content_types() {
		let path = get_test_pdf_path();

		let content_types = PdfProcessor::get_page_content_types(&path, vec![1]);
		assert!(content_types.is_ok());
	}
}
