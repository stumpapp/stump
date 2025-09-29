use std::{
	collections::HashMap,
	io::Cursor,
	path::{Path, PathBuf},
};

use models::shared::image_processor_options::SupportedImageFormat;
use pdf::{file::FileOptions, object::ParseOptions};
use pdfium_render::prelude::{PdfRenderConfig, Pdfium};

use crate::{
	config::StumpConfig,
	filesystem::{
		archive::create_zip_archive,
		error::FileError,
		hash::{self, generate_koreader_hash},
		image::into_image_format,
		media::{
			process::{
				FileConverter, FileProcessor, FileProcessorOptions, ProcessedFile,
			},
			ProcessedFileHashes, ProcessedMediaMetadata,
		},
		ContentType, FileParts, PathUtils,
	},
};

/// A file processor for PDF files.
pub struct PdfProcessor;

impl FileProcessor for PdfProcessor {
	// It is REALLY annoying to work with PDFs, and there is no good way to consume
	// each page as a vector of bytes efficiently. Since PDFs don't really have metadata,
	// I wouldn't expect the file to change much after a scan. So, for now, this will
	// just make the sample size approximately 1/10th of the file size.
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let file = std::fs::File::open(path)?;
		let metadata = file.metadata()?;
		let size = metadata.len();

		if size < 10 {
			tracing::warn!(path, size, "File is too small to sample!");
			return Err(FileError::PdfProcessingError(String::from(
				"File is too small to sample!",
			)));
		}

		Ok(size / 10)
	}

	fn generate_stump_hash(path: &str) -> Option<String> {
		let sample_result = PdfProcessor::get_sample_size(path);

		if let Ok(sample) = sample_result {
			match hash::generate(path, sample) {
				Ok(digest) => Some(digest),
				Err(e) => {
					tracing::debug!(error = ?e, path, "Failed to digest PDF file");
					None
				},
			}
		} else {
			None
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
			.then(|| PdfProcessor::generate_stump_hash(path))
			.flatten();
		let koreader_hash = generate_koreader_hashes
			.then(|| generate_koreader_hash(path))
			.transpose()?;

		Ok(ProcessedFileHashes {
			hash,
			koreader_hash,
		})
	}

	fn process_metadata(path: &str) -> Result<Option<ProcessedMediaMetadata>, FileError> {
		let file = FileOptions::cached()
			.parse_options(ParseOptions::tolerant())
			.open(path)?;

		Ok(file.trailer.info_dict.map(ProcessedMediaMetadata::from))
	}

	fn process(
		path: &str,
		options: FileProcessorOptions,
		_: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		let file = FileOptions::cached()
			.parse_options(ParseOptions::tolerant())
			.open(path)?;

		let pages = file.pages().count() as i32;
		// Note: The metadata is already parsed by the PDF library, so might as well use it
		// PDF metadata is generally poop though
		let metadata = file.trailer.info_dict.map(ProcessedMediaMetadata::from);
		let ProcessedFileHashes {
			hash,
			koreader_hash,
		} = PdfProcessor::generate_hashes(path, options)?;

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
		// This is the sync version - we'll create an async wrapper that handles caching
		PdfProcessor::render_page_sync(path, page, config)
	}

	fn get_page_count(path: &str, config: &StumpConfig) -> Result<i32, FileError> {
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;
		let document = pdfium.load_pdf_from_file(path, None)?;

		Ok(document.pages().len() as i32)
	}

	fn get_page_content_types(
		_: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		// Note: This method can't access config, so we return WebP as the default
		// since that's our new default format. The actual format will be determined
		// at render time based on the configuration.
		Ok(pages
			.into_iter()
			.map(|page| (page, ContentType::WEBP))
			.collect())
	}
}

impl PdfProcessor {
	/// Initializes a PDFium renderer. If a path to the PDFium library is not provided
	pub fn renderer(pdfium_path: &Option<String>) -> Result<Pdfium, FileError> {
		if let Some(path) = pdfium_path {
			let bindings = Pdfium::bind_to_library(path)
			.or_else(|e| {
				tracing::error!(provided_path = ?path, ?e, "Failed to bind to PDFium library at provided path");
				Pdfium::bind_to_system_library()
			})?;
			Ok(Pdfium::new(bindings))
		} else {
			tracing::warn!(
				"No PDFium path provided, will attempt to bind to system library"
			);
			Pdfium::bind_to_system_library()
				.map(Pdfium::new)
				.map_err(|_| FileError::PdfConfigurationError)
		}
	}

	/// Synchronous page rendering without caching (used internally)
	pub fn render_page_sync(
		path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		Self::render_page_with_quality(path, page, config, false)
	}

	/// Core rendering function with configurable quality
	pub fn render_page_with_quality(
		path: &str,
		page: i32,
		config: &StumpConfig,
		force_high_quality: bool,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		tracing::debug!(path, page, force_high_quality, "Starting PDF page render");

		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;

		let document = pdfium.load_pdf_from_file(path, None)?;
		let total_pages = document.pages().len() as usize;

		// Validate page number bounds
		if page < 1 {
			return Err(FileError::PdfProcessingError(format!(
				"Invalid page number {}, must be >= 1",
				page
			)));
		}

		let page_index_usize = (page - 1) as usize;
		if page_index_usize >= total_pages {
			return Err(FileError::PdfProcessingError(format!(
				"Page {} out of bounds, document has {} pages",
				page, total_pages
			)));
		}

		// Convert back to u16 for pdfium API
		let page_index_u16 = page_index_usize as u16;

		tracing::debug!(path, page, total_pages, "Loading PDF page");
		let document_page = document.pages().get(page_index_u16)?;

		// Configure rendering with quality settings
		let use_high_quality = force_high_quality || config.pdf_high_quality;

		let render_config = if use_high_quality {
			PdfRenderConfig::new()
				.set_target_width(config.pdf_max_dimension as i32)
				.set_maximum_height(config.pdf_max_dimension as i32)
				.use_print_quality(true)
				.set_image_smoothing(true)
				.set_text_smoothing(true)
				.set_path_smoothing(true)
		} else {
			// Fast rendering while maintaining text readability
			let fast_dimension = (config.pdf_max_dimension * 4 / 5).max(900);
			PdfRenderConfig::new()
				.set_target_width(fast_dimension as i32)
				.set_maximum_height(fast_dimension as i32)
				.use_print_quality(false)
				.set_image_smoothing(false)
				.set_text_smoothing(true)
				.set_path_smoothing(false)
		};

		let bitmap = document_page.render_with_config(&render_config)?;
		let dyn_image = bitmap.as_image();

		// Get the configured output format
		let output_format = config.get_pdf_render_format();
		let image_format = into_image_format(output_format);
		let content_type = ContentType::from(output_format);

		if let Some(image) = dyn_image.as_rgba8() {
			let mut buffer = Cursor::new(vec![]);
			image
				.write_to(&mut buffer, image_format)
				.map_err(|e| {
					tracing::error!(error = ?e, format = ?image_format, "Failed to write image to buffer");
					FileError::PdfProcessingError(String::from(
						"An image could not be rendered from the PDF page",
					))
				})?;
			Ok((content_type, buffer.into_inner()))
		} else {
			tracing::warn!(
				path,
				page,
				"An image could not be rendered from the PDF page"
			);
			Err(FileError::PdfProcessingError(String::from(
				"An image could not be rendered from the PDF page",
			)))
		}
	}

	/// Async version of get_page with caching support
	pub async fn get_page_async(
		path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		tracing::debug!(
			path,
			page,
			cache_enabled = config.pdf_cache_pages,
			"PDF get_page_async called"
		);

		let use_caching = config.pdf_cache_pages;

		// Check cache first if caching is enabled
		if use_caching {
			match Self::get_cached_page(path, page, config).await {
				Ok(Some(cached)) => {
					tracing::debug!(path, page, "Cache hit for PDF page");
					return Ok(cached);
				},
				Ok(None) => {
					tracing::debug!(path, page, "Cache miss for PDF page");
				},
				Err(e) => {
					tracing::warn!(
						path,
						page,
						error = ?e,
						"Cache check failed, falling back to direct render"
					);
				},
			}
		}

		// Render the page in a blocking task
		let path_owned = path.to_string();
		let config_owned = config.clone();

		tracing::debug!(path, page, "Starting PDF page render task");
		let render_task = tokio::task::spawn_blocking(move || {
			let start = std::time::Instant::now();
			let render_result = Self::render_page_sync(&path_owned, page, &config_owned);
			let duration = start.elapsed();

			match &render_result {
				Ok((content_type, data)) => {
					tracing::debug!(
						path = %path_owned,
						page,
						content_type = ?content_type,
						size = data.len(),
						duration_ms = duration.as_millis(),
						"PDF page rendered successfully"
					);
				},
				Err(e) => {
					tracing::error!(
						path = %path_owned,
						page,
						error = ?e,
						duration_ms = duration.as_millis(),
						"PDF page render failed"
					);
				},
			}

			render_result
		});

		let result = match render_task.await {
			Ok(render_result) => render_result?,
			Err(e) => {
				tracing::error!(path, page, error = ?e, "PDF render task panicked");
				return Err(FileError::PdfProcessingError(format!(
					"Render task panicked: {}",
					e
				)));
			},
		};

		// Cache the result if caching is enabled (but don't fail if caching fails)
		if use_caching {
			if let Err(e) = Self::cache_page(path, page, &result.1, config).await {
				tracing::warn!(
					path,
					page,
					error = ?e,
					"Failed to cache rendered page, continuing without caching"
				);
			}
		}

		// Trigger pre-rendering for adjacent pages in background if enabled
		if use_caching && config.pdf_prerender_range > 0 {
			let path_owned = path.to_string();
			let config_owned = config.clone();
			tokio::spawn(async move {
				Self::prerender_adjacent_pages(&path_owned, page, &config_owned).await;
			});
		}

		Ok(result)
	}

	/// Generate a cache key for a PDF page based on file path, page number, and render settings
	async fn generate_cache_key(
		pdf_path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<String, FileError> {
		// Use file metadata and config to create a unique cache key
		let metadata = tokio::fs::metadata(pdf_path).await?;
		let modified_time = metadata
			.modified()
			.map_err(|e| {
				FileError::PdfProcessingError(format!(
					"Cannot get file modified time: {}",
					e
				))
			})?
			.duration_since(std::time::UNIX_EPOCH)
			.map_err(|e| {
				FileError::PdfProcessingError(format!("Invalid file time: {}", e))
			})?
			.as_secs();

		let file_size = metadata.len();

		// Create a more robust hash using file path, size, and modified time
		use std::collections::hash_map::DefaultHasher;
		use std::hash::{Hash, Hasher};

		let mut hasher = DefaultHasher::new();
		pdf_path.hash(&mut hasher);
		file_size.hash(&mut hasher);
		modified_time.hash(&mut hasher);
		config.pdf_max_dimension.hash(&mut hasher);
		config.pdf_render_dpi.hash(&mut hasher);
		config.pdf_render_format.hash(&mut hasher);
		config.pdf_high_quality.hash(&mut hasher);
		page.hash(&mut hasher);

		let file_hash = hasher.finish();

		// Use a safer filename format
		Ok(format!("pdf_{}_{}", file_hash, page))
	}

	/// Check if a cached page exists and return its content
	async fn get_cached_page(
		pdf_path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<Option<(ContentType, Vec<u8>)>, FileError> {
		if !config.pdf_cache_pages {
			return Ok(None);
		}

		let cache_key = match Self::generate_cache_key(pdf_path, page, config).await {
			Ok(key) => key,
			Err(e) => {
				tracing::debug!(error = ?e, "Failed to generate cache key");
				return Ok(None);
			},
		};

		let output_format = config.get_pdf_render_format();
		let cache_file = config.get_pdf_cache_dir().join(format!(
			"{}.{}",
			cache_key,
			output_format.extension()
		));

		// Check if file exists and is readable
		match tokio::fs::metadata(&cache_file).await {
			Ok(metadata) => {
				// Ensure it's a file and has content
				if metadata.is_file() && metadata.len() > 0 {
					match tokio::fs::read(&cache_file).await {
						Ok(bytes) if !bytes.is_empty() => {
							tracing::debug!(
								cache_file = ?cache_file,
								size = bytes.len(),
								"Cache hit for PDF page"
							);
							return Ok(Some((ContentType::from(output_format), bytes)));
						},
						Ok(_) => {
							tracing::debug!(cache_file = ?cache_file, "Cache file is empty, removing");
							let _ = tokio::fs::remove_file(&cache_file).await;
						},
						Err(e) => {
							tracing::debug!(
								cache_file = ?cache_file,
								error = ?e,
								"Failed to read cached PDF page"
							);
						},
					}
				}
			},
			Err(_) => {
				// File doesn't exist or isn't accessible
			},
		}

		Ok(None)
	}

	/// Save a rendered page to the cache
	async fn cache_page(
		pdf_path: &str,
		page: i32,
		content: &[u8],
		config: &StumpConfig,
	) -> Result<(), FileError> {
		if !config.pdf_cache_pages || content.is_empty() {
			return Ok(());
		}

		let cache_key = match Self::generate_cache_key(pdf_path, page, config).await {
			Ok(key) => key,
			Err(e) => {
				tracing::debug!(error = ?e, "Failed to generate cache key, skipping cache");
				return Ok(());
			},
		};

		let cache_dir = config.get_pdf_cache_dir();

		// Ensure cache directory exists
		if let Err(e) = tokio::fs::create_dir_all(&cache_dir).await {
			tracing::warn!(cache_dir = ?cache_dir, error = ?e, "Failed to create cache directory");
			return Ok(());
		}

		let output_format = config.get_pdf_render_format();
		let cache_file =
			cache_dir.join(format!("{}.{}", cache_key, output_format.extension()));
		let temp_file =
			cache_dir.join(format!("{}.{}.tmp", cache_key, output_format.extension()));

		// Atomic write: write to temp file first, then rename
		match tokio::fs::write(&temp_file, content).await {
			Ok(_) => {
				// Atomically move temp file to final location
				match tokio::fs::rename(&temp_file, &cache_file).await {
					Ok(_) => {
						tracing::debug!(
							cache_file = ?cache_file,
							size = content.len(),
							"Cached PDF page successfully"
						);
					},
					Err(e) => {
						tracing::warn!(
							cache_file = ?cache_file,
							error = ?e,
							"Failed to move temp cache file"
						);
						// Clean up temp file
						let _ = tokio::fs::remove_file(&temp_file).await;
					},
				}
			},
			Err(e) => {
				tracing::warn!(
					cache_file = ?cache_file,
					error = ?e,
					"Failed to write to temp cache file"
				);
			},
		}

		Ok(())
	}

	/// Pre-render adjacent pages in the background for faster loading
	async fn prerender_adjacent_pages(
		pdf_path: &str,
		current_page: i32,
		config: &StumpConfig,
	) {
		// Skip pre-rendering if disabled
		if !config.pdf_cache_pages || config.pdf_prerender_range == 0 {
			return;
		}

		let range = config.pdf_prerender_range as i32;

		// Get total page count
		let total_pages = match Self::get_page_count(pdf_path, config) {
			Ok(count) => count,
			Err(e) => {
				tracing::debug!(
					pdf_path,
					error = ?e,
					"Failed to get page count for pre-rendering, skipping"
				);
				return;
			},
		};

		// Calculate page range for pre-rendering
		let start_page = (current_page - range).max(1);
		let end_page = (current_page + range).min(total_pages);
		let max_concurrent = 2; // Limit concurrent tasks to prevent resource exhaustion

		tracing::debug!(
			pdf_path,
			current_page,
			start_page,
			end_page,
			total_pages,
			"Pre-rendering adjacent pages"
		);

		// Pre-render pages that aren't cached yet (limit concurrency)
		let mut tasks = Vec::new();

		// Prioritize pages closer to current page for better navigation experience
		let mut pages_to_render: Vec<i32> = (start_page..=end_page)
			.filter(|&page| page != current_page)
			.collect();

		// Sort by distance from current page (closest first)
		pages_to_render.sort_by_key(|&page| (page - current_page).abs());

		for page in pages_to_render {
			// Check if already cached
			if let Ok(Some(_)) = Self::get_cached_page(pdf_path, page, config).await {
				continue; // Already cached
			}

			// Limit concurrent pre-rendering tasks to prevent resource exhaustion
			if tasks.len() >= max_concurrent {
				break;
			}

			// Render and cache the page
			let path_owned = pdf_path.to_string();
			let config_owned = config.clone();

			let task = tokio::task::spawn_blocking(move || {
				// Use high quality for pre-rendered pages since they'll be cached
				Self::render_page_with_quality(&path_owned, page, &config_owned, true)
			});

			tasks.push((page, task));
		}

		// Process pre-rendering tasks
		for (page, task) in tasks {
			match task.await {
				Ok(Ok((_, content))) => {
					// Cache the rendered page
					if let Err(e) =
						Self::cache_page(pdf_path, page, &content, config).await
					{
						tracing::debug!(
							pdf_path,
							page,
							error = ?e,
							"Failed to cache pre-rendered page"
						);
					} else {
						tracing::debug!(pdf_path, page, "Pre-rendered and cached page");
					}
				},
				Ok(Err(e)) => {
					tracing::debug!(
						pdf_path,
						page,
						error = ?e,
						"Failed to render page during pre-rendering"
					);
				},
				Err(e) => {
					tracing::debug!(
						pdf_path,
						page,
						error = ?e,
						"Pre-rendering task failed"
					);
				},
			}
		}
	}
}

impl FileConverter for PdfProcessor {
	fn to_zip(
		path: &str,
		delete_source: bool,
		format: Option<SupportedImageFormat>,
		config: &StumpConfig,
	) -> Result<PathBuf, FileError> {
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;

		let document = pdfium.load_pdf_from_file(path, None)?;
		let iter = document.pages().iter();

		// Use high-quality rendering configuration with config settings
		let render_config = PdfRenderConfig::new()
			.set_target_width(config.pdf_max_dimension as i32)
			.set_maximum_height(config.pdf_max_dimension as i32)
			.use_print_quality(true)
			.set_image_smoothing(true)
			.set_text_smoothing(true)
			.set_path_smoothing(true);

		// Prefer configured format, then provided format, then default to WebP for better compression
		let output_format = format
			.map(into_image_format)
			.unwrap_or_else(|| into_image_format(config.get_pdf_render_format()));

		let converted_pages = iter
			.enumerate()
			.map(|(idx, page)| {
				let bitmap = page.render_with_config(&render_config)?;
				let dyn_image = bitmap.as_image();

				if let Some(image) = dyn_image.as_rgba8() {
					let mut buffer = Cursor::new(vec![]);
					image.write_to(&mut buffer, output_format).map_err(|e| {
						tracing::error!(error = ?e, "Failed to write image to buffer");
						FileError::PdfProcessingError(String::from(
							"An image could not be rendered from the PDF page",
						))
					})?;
					Ok(buffer.into_inner())
				} else {
					tracing::warn!(
						path,
						page = idx + 1,
						"An image could not be rendered from the PDF page"
					);
					Err(FileError::PdfProcessingError(String::from(
						"An image could not be rendered from the PDF page",
					)))
				}
			})
			.filter_map(Result::ok)
			.collect::<Vec<Vec<u8>>>();

		let path_buf = PathBuf::from(path);
		let parent = path_buf.parent().unwrap_or_else(|| Path::new("/"));
		let FileParts {
			file_name,
			file_stem,
			extension,
		} = path_buf.as_path().file_parts();

		let cache_dir = config.get_cache_dir();
		let unpacked_path = cache_dir.join(file_stem);

		// create folder for the zip
		std::fs::create_dir_all(&unpacked_path)?;

		// write each image to the folder
		for image_buf in converted_pages {
			// write the image to file with proper extension
			let output_extension = format.as_ref().map_or("png", |f| f.extension());

			let image_path =
				unpacked_path.join(format!("{file_name}.{output_extension}"));

			// NOTE: This isn't bubbling up because I don't think at this point it should
			// kill the whole conversion process.
			if let Err(err) = std::fs::write(image_path, image_buf) {
				tracing::error!(error = ?err, "Failed to write image to file");
			}
		}

		let zip_path =
			create_zip_archive(&unpacked_path, &file_name, &extension, parent)?;

		// TODO: won't work in docker
		if delete_source {
			if let Err(err) = trash::delete(path) {
				tracing::error!(error = ?err, path, "Failed to delete converted PDF source file");
			}
		}

		// TODO: maybe check that this path isn't in a pre-defined list of important paths?
		if let Err(err) = std::fs::remove_dir_all(&unpacked_path) {
			tracing::error!(
				error = ?err, ?cache_dir, ?unpacked_path, "Failed to delete unpacked contents in cache",
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
