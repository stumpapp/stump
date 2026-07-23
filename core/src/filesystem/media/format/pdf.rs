use std::{
	collections::HashMap,
	io::Cursor,
	path::{Path, PathBuf},
	sync::OnceLock,
};

use models::shared::image_processor_options::SupportedImageFormat;
use pdfium_render::prelude::{
	PdfColor, PdfDocumentMetadataTagType, PdfRenderConfig, Pdfium,
};

use crate::{
	config::StumpConfig,
	filesystem::{
		archive::create_zip_archive,
		error::FileError,
		hash::{self, generate_koreader_hash},
		image::into_image_format,
		media::{
			process::{
				AnalyzedPage, FileConverter, FileProcessor, FileProcessorOptions,
				ProcessedFile,
			},
			ProcessedFileHashes, ProcessedMediaMetadata,
		},
		ContentType, FileParts, PathUtils,
	},
};

static PDFIUM: OnceLock<Result<Pdfium, FileError>> = OnceLock::new();

pub struct PdfProcessor;

impl FileProcessor for PdfProcessor {
	// sample size is ~1/10th of the file size
	fn get_sample_size(path: &str) -> Result<u64, FileError> {
		let size = std::fs::metadata(path)?.len();
		if size < 10 {
			return Err(FileError::PdfProcessingError(
				"File too small to sample".to_string(),
			));
		}
		Ok(size / 10)
	}

	fn generate_stump_hash(path: &str) -> Option<String> {
		let sample = PdfProcessor::get_sample_size(path).ok()?;
		hash::generate(path, sample).ok()
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
		Self::process_metadata_internal(path, &None)
	}

	fn process(
		path: &str,
		options: FileProcessorOptions,
		config: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		let pdfium = Self::renderer(&config.pdfium_path)?;
		let document = pdfium.load_pdf_from_file(path, None)?;
		let pages = document.pages().len();

		let metadata = if options.process_metadata {
			Self::process_metadata_internal(path, &config.pdfium_path)?
		} else {
			None
		};

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
		PdfProcessor::render_page_sync(path, page, config)
	}

	fn get_page_count(path: &str, config: &StumpConfig) -> Result<i32, FileError> {
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;
		let document = pdfium.load_pdf_from_file(path, None)?;

		Ok(document.pages().len())
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

	fn analyze_page(
		path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<AnalyzedPage, FileError> {
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;
		let document = pdfium.load_pdf_from_file(path, None)?;

		let total_pages = document.pages().len() as usize;
		if page < 1 || page as usize > total_pages {
			return Err(FileError::PdfProcessingError(
				"Page out of bounds".to_string(),
			));
		}

		let size = document.pages().page_size(((page - 1) as u16).into())?;
		let width = size.width().value as u32;
		let height = size.height().value as u32;

		let output_format = config.get_pdf_render_format();
		let content_type = ContentType::from(output_format);

		Ok(AnalyzedPage {
			width,
			height,
			content_type,
		})
	}
}

impl PdfProcessor {
	/// Process the metadata of a PDF file using the specified config/env pdfium path.
	pub fn process_metadata_internal(
		path: &str,
		pdfium_path: &Option<String>,
	) -> Result<Option<ProcessedMediaMetadata>, FileError> {
		let pdfium = Self::renderer(pdfium_path)?;
		let document = pdfium.load_pdf_from_file(path, None)?;

		// Extract metadata from PDFium document tags
		let mut metadata_map: HashMap<String, Vec<String>> = HashMap::new();
		for tag in document.metadata().iter() {
			let value_ref = tag.value();
			if value_ref.is_empty() {
				continue;
			}
			let value = value_ref.to_string();
			let key = match tag.tag_type() {
				PdfDocumentMetadataTagType::Title => "title".to_string(),
				PdfDocumentMetadataTagType::Author => "author".to_string(),
				PdfDocumentMetadataTagType::Subject => "summary".to_string(),
				PdfDocumentMetadataTagType::Keywords => "tags".to_string(),
				PdfDocumentMetadataTagType::CreationDate => "date".to_string(),
				PdfDocumentMetadataTagType::ModificationDate => "date".to_string(),
				_ => continue,
			};
			metadata_map.entry(key).or_default().push(value);
		}

		let metadata = if metadata_map.is_empty() {
			None
		} else {
			Some(ProcessedMediaMetadata::from(metadata_map))
		};

		Ok(metadata)
	}

	/// Returns the global pdfium singleton, initializing it on first call
	///
	/// Note that a failed init is cached permanently and requires a restart the process to retry
	/// initialization
	///
	/// See: https://github.com/ajrcarey/pdfium-render#thread-safety
	pub fn renderer(pdfium_path: &Option<String>) -> Result<&'static Pdfium, FileError> {
		let result = PDFIUM.get_or_init(|| {
			let  path = pdfium_path.clone().or_else(|| std::env::var("PDFIUM_PATH").ok());

			if let Some(path) = path {
				tracing::info!(path, "Initializing PDFium from provided path");
				let bindings = Pdfium::bind_to_library(&path)
					.or_else(|e| {
						tracing::error!(provided_path = ?path, ?e, "Failed to bind to PDFium library at provided path, attempting fallback to system library");
						Pdfium::bind_to_system_library()
					})
					.map_err(|e| {
						tracing::error!(?e, "Failed to bind to system PDFium library");
						FileError::PdfConfigurationError
					})?;
				Ok(Pdfium::new(bindings))
			} else {
				tracing::warn!("No PDFium path provided, will attempt to bind to system library");
				Pdfium::bind_to_system_library()
					.map(Pdfium::new)
					.map_err(|e| {
						tracing::error!(?e, "Failed to bind to system PDFium library");
						FileError::PdfConfigurationError
					})
			}
		});

		result
			.as_ref()
			.map_err(|_| FileError::PdfConfigurationError)
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
		let pdfium = PdfProcessor::renderer(&config.pdfium_path)?;
		let document = pdfium.load_pdf_from_file(path, None)?;
		let total_pages = document.pages().len() as usize;

		if page < 1 || page as usize > total_pages {
			return Err(FileError::PdfProcessingError(
				"Page out of bounds".to_string(),
			));
		}

		let page_index = (page - 1) as pdfium_render::prelude::PdfPageIndex;
		let document_page = document.pages().get(page_index)?;

		let page_width = document_page.width().value;
		let page_height = document_page.height().value;

		// scale from PDF's 72 DPI base to configured DPI, then clamp to max dimension
		let dpi_scale = config.pdf_render_dpi as f32 / 72.0;
		let mut target_width = page_width * dpi_scale;
		let mut target_height = page_height * dpi_scale;
		let max_dim = config.pdf_max_dimension as f32;
		if max_dim > 0.0 && (target_width > max_dim || target_height > max_dim) {
			let fit_scale = (max_dim / target_width).min(max_dim / target_height);
			target_width *= fit_scale;
			target_height *= fit_scale;
		}

		let target_width = target_width.max(1.0) as i32;
		let target_height = target_height.max(1.0) as i32;

		let use_high_quality = force_high_quality || config.pdf_high_quality;
		let render_config = if use_high_quality {
			PdfRenderConfig::new()
				.set_target_width(target_width)
				.set_maximum_height(target_height)
				.use_print_quality(true)
				.set_image_smoothing(true)
				.set_text_smoothing(true)
				.set_path_smoothing(true)
				.set_clear_color(PdfColor::new(255, 255, 255, 255))
				.clear_before_rendering(true)
		} else {
			// Fast rendering while maintaining text readability
			let fast_width = (target_width * 4 / 5).max(1);
			let fast_height = (target_height * 4 / 5).max(1);
			PdfRenderConfig::new()
				.set_target_width(fast_width)
				.set_maximum_height(fast_height)
				.use_print_quality(false)
				.set_image_smoothing(false)
				.set_text_smoothing(true)
				.set_path_smoothing(false)
				.set_clear_color(PdfColor::new(255, 255, 255, 255))
				.clear_before_rendering(true)
		};

		let bitmap = document_page.render_with_config(&render_config)?;
		let dyn_image = bitmap.as_image()?;

		let output_format = config.get_pdf_render_format();
		let image_format = into_image_format(output_format);
		let content_type = ContentType::from(output_format);

		let image = dyn_image.as_rgba8().ok_or_else(|| {
			FileError::PdfProcessingError("Failed to convert image to RGBA8".to_string())
		})?;

		let mut buffer = Cursor::new(vec![]);
		image.write_to(&mut buffer, image_format)?;
		Ok((content_type, buffer.into_inner()))
	}

	/// Async version of get_page with caching support
	pub async fn get_page_async(
		path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		// Check cache first if caching is enabled
		if config.pdf_cache_pages {
			if let Ok(Some(cached)) = Self::get_cached_page(path, page, config).await {
				if config.pdf_prerender_range > 0 {
					let path_owned = path.to_string();
					let config_owned = config.clone();
					tokio::spawn(async move {
						Self::prerender_adjacent_pages(&path_owned, page, &config_owned)
							.await;
					});
				}
				return Ok(cached);
			}
		}

		let path_owned = path.to_string();
		let config_owned = config.clone();

		// Render the page in a blocking task
		let result = tokio::task::spawn_blocking(move || {
			Self::render_page_sync(&path_owned, page, &config_owned)
		})
		.await
		.map_err(|e| {
			FileError::PdfProcessingError(format!("Render task panicked: {}", e))
		})??;

		if config.pdf_cache_pages {
			// non-fatal, does not rly matter if caching fails
			let _ = Self::cache_page(path, page, &result.1, config).await;
		}

		if config.pdf_cache_pages && config.pdf_prerender_range > 0 {
			let path_owned = path.to_string();
			let config_owned = config.clone();
			tokio::spawn(async move {
				Self::prerender_adjacent_pages(&path_owned, page, &config_owned).await;
			});
		}

		Ok(result)
	}

	fn generate_cache_key(
		pdf_path: &str,
		page: i32,
		config: &StumpConfig,
	) -> Result<String, FileError> {
		let metadata = std::fs::metadata(pdf_path)?;
		let modified_time = metadata
			.modified()?
			.duration_since(std::time::UNIX_EPOCH)
			.map_err(|e| FileError::PdfProcessingError(e.to_string()))?
			.as_secs();
		let file_size = metadata.len();

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

		Ok(format!("pdf_{}_{}", hasher.finish(), page))
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

		let cache_key = Self::generate_cache_key(pdf_path, page, config)?;
		let output_format = config.get_pdf_render_format();
		let cache_file = config.get_pdf_cache_dir().join(format!(
			"{}.{}",
			cache_key,
			output_format.extension()
		));

		if cache_file.exists() {
			match tokio::fs::read(&cache_file).await {
				Ok(bytes) => {
					if !bytes.is_empty() {
						return Ok(Some((ContentType::from(output_format), bytes)));
					}
					let _ = tokio::fs::remove_file(&cache_file).await;
				},
				Err(e) => {
					tracing::warn!(cache_file = ?cache_file, error = ?e, "Failed to read cache file");
				},
			}
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

		let cache_key = Self::generate_cache_key(pdf_path, page, config)?;
		let cache_dir = config.get_pdf_cache_dir();

		if !cache_dir.exists() {
			if let Err(e) = tokio::fs::create_dir_all(&cache_dir).await {
				tracing::warn!(cache_dir = ?cache_dir, error = ?e, "Failed to create cache directory");
				return Ok(());
			}
		}

		let output_format = config.get_pdf_render_format();
		let cache_file =
			cache_dir.join(format!("{}.{}", cache_key, output_format.extension()));
		let temp_file =
			cache_dir.join(format!("{}.{}.tmp", cache_key, output_format.extension()));

		match tokio::fs::write(&temp_file, content).await {
			Ok(_) => match tokio::fs::rename(&temp_file, &cache_file).await {
				Ok(_) => {
					tracing::debug!(
						?cache_file,
						size = content.len(),
						"Cached PDF page successfully"
					);
				},
				Err(error) => {
					tracing::warn!(?cache_file, ?error, "Failed to move temp cache file");
					let _ = tokio::fs::remove_file(&temp_file).await;
				},
			},
			Err(error) => {
				tracing::warn!(?cache_file, ?error, "Failed to write to temp cache file");
			},
		}

		Ok(())
	}

	async fn prerender_adjacent_pages(
		pdf_path: &str,
		current_page: i32,
		config: &StumpConfig,
	) {
		if !config.pdf_cache_pages || config.pdf_prerender_range == 0 {
			return;
		}

		let pdf_path_owned = pdf_path.to_string();
		let config_owned = config.clone();

		let total_pages = match Self::get_page_count(&pdf_path_owned, &config_owned) {
			Ok(count) => count,
			Err(e) => {
				tracing::debug!(
					pdf_path = %pdf_path_owned,
					error = ?e,
					"Failed to get page count for pre-rendering, skipping"
				);
				return;
			},
		};

		let range = config_owned.pdf_prerender_range as i32;
		let start_page = (current_page - range).max(1);
		let end_page = (current_page + range).min(total_pages);

		tracing::debug!(
			pdf_path = %pdf_path_owned,
			current_page,
			start_page,
			end_page,
			total_pages,
			"Pre-rendering adjacent pages"
		);

		// sort closest-first so the most useful pages render first
		let mut pages_to_render: Vec<i32> = (start_page..=end_page)
			.filter(|&page| page != current_page)
			.collect();
		pages_to_render.sort_by_key(|&page| (page - current_page).abs());

		// there is some ambiguity around thread safety you can read about here: https://github.com/stumpapp/stump/pull/1209#discussion_r3359574540
		// until proven otherwise, i am inclined to lean into pdfium-render's internal mechanisms
		// for thread safety and avoid reinventing it here. as such, pages are processed sequentially.
		for page in pages_to_render {
			if let Ok(Some(_)) =
				Self::get_cached_page(&pdf_path_owned, page, &config_owned).await
			{
				continue; // already cached = no work
			}

			let path_clone = pdf_path_owned.clone();
			let config_clone = config_owned.clone();
			let render_result = tokio::task::spawn_blocking(move || {
				Self::render_page_with_quality(&path_clone, page, &config_clone, true)
			})
			.await;

			match render_result {
				Ok(Ok((_, content))) => {
					if let Err(e) =
						Self::cache_page(&pdf_path_owned, page, &content, &config_owned)
							.await
					{
						tracing::debug!(
							pdf_path = %pdf_path_owned,
							page,
							error = ?e,
							"Failed to cache pre-rendered page"
						);
					} else {
						tracing::debug!(
							pdf_path = %pdf_path_owned,
							page,
							"Pre-rendered and cached page successfully"
						);
					}
				},
				Ok(Err(e)) => {
					tracing::debug!(
						pdf_path = %pdf_path_owned,
						page,
						error = ?e,
						"Failed to render page during pre-rendering"
					);
				},
				Err(e) => {
					tracing::debug!(
						pdf_path = %pdf_path_owned,
						page,
						error = ?e,
						"Pre-rendering task panicked"
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

		let chosen_format = format.unwrap_or_else(|| config.get_pdf_render_format());
		let output_format = into_image_format(chosen_format);
		let output_extension = chosen_format.extension();

		let converted_pages = document
			.pages()
			.iter()
			.enumerate()
			.filter_map(|(idx, page)| {
				let render_page = || -> Result<Vec<u8>, FileError> {
					let page_width = page.width().value;
					let page_height = page.height().value;

					// scale from PDF's 72 DPI base to configured DPI, then clamp to max dimension
					let dpi_scale = config.pdf_render_dpi as f32 / 72.0;
					let mut target_width = page_width * dpi_scale;
					let mut target_height = page_height * dpi_scale;

					let max_dim = config.pdf_max_dimension as f32;
					if max_dim > 0.0
						&& (target_width > max_dim || target_height > max_dim)
					{
						let fit_scale =
							(max_dim / target_width).min(max_dim / target_height);
						target_width *= fit_scale;
						target_height *= fit_scale;
					}

					let render_config = PdfRenderConfig::new()
						.set_target_width(target_width.max(1.0) as i32)
						.set_maximum_height(target_height.max(1.0) as i32)
						.use_print_quality(true)
						.set_image_smoothing(true)
						.set_text_smoothing(true)
						.set_path_smoothing(true)
						.set_clear_color(PdfColor::new(255, 255, 255, 255))
						.clear_before_rendering(true);

					let bitmap = page.render_with_config(&render_config)?;
					let dyn_image = bitmap.as_image()?;

					let image = dyn_image.as_rgba8().ok_or_else(|| {
						FileError::PdfProcessingError(format!(
							"Failed to render page {} as RGBA8",
							idx + 1
						))
					})?;
					let mut buffer = Cursor::new(vec![]);
					image.write_to(&mut buffer, output_format)?;
					Ok(buffer.into_inner())
				};

				match render_page() {
					Ok(buf) => Some((idx, buf)),
					Err(e) => {
						tracing::error!(error = ?e, "Failed to render PDF page {}", idx + 1);
						None
					},
				}
			})
			.collect::<Vec<(usize, Vec<u8>)>>();

		let path_buf = PathBuf::from(path);
		let parent = path_buf.parent().unwrap_or_else(|| Path::new("/"));
		let FileParts {
			file_name,
			file_stem,
			extension,
		} = path_buf.as_path().file_parts();

		let cache_dir = config.get_cache_dir();
		let unpacked_path = cache_dir.join(&file_stem);

		std::fs::create_dir_all(&unpacked_path)?;

		for (idx, image_buf) in converted_pages {
			let image_path = unpacked_path.join(format!(
				"{}_{:03}.{}",
				file_stem,
				idx + 1,
				output_extension
			));
			if let Err(err) = std::fs::write(&image_path, image_buf) {
				// non-fatal, don't think we should fail the entire conversion if one page fails to write
				tracing::error!(error = ?err, ?image_path, "Failed to write PDF page image to file");
			}
		}

		let zip_path =
			create_zip_archive(&unpacked_path, &file_name, &extension, parent)?;

		if delete_source {
			// note that the trash::delete won't work in docker, but or_else should hit in that case
			let _ = trash::delete(path).or_else(|_| std::fs::remove_file(path));
		}

		// TODO: guard against accidentally deleting important paths
		if unpacked_path.exists() {
			let _ = std::fs::remove_dir_all(&unpacked_path);
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
		if PdfProcessor::renderer(&None).is_err() {
			eprintln!("Skipping test: PDFium is not configured or available.");
			return;
		}
		let path = get_test_pdf_path();
		let config = StumpConfig::debug();

		let processed_file = PdfProcessor::process(
			&path,
			FileProcessorOptions {
				convert_rar_to_zip: false,
				delete_conversion_source: false,
				process_metadata: true,
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

	#[test]
	fn test_process_metadata() {
		if PdfProcessor::renderer(&None).is_err() {
			eprintln!("Skipping test: PDFium is not configured or available.");
			return;
		}
		let path = get_test_pdf_path();
		let metadata = PdfProcessor::process_metadata(&path);
		assert!(metadata.is_ok());
	}

	#[test]
	fn test_get_sample_size() {
		let path = get_test_pdf_path();
		let sample_size = PdfProcessor::get_sample_size(&path);
		assert!(sample_size.is_ok());
		assert!(sample_size.unwrap() > 0);
	}

	#[test]
	fn test_generate_stump_hash() {
		let path = get_test_pdf_path();
		let hash = PdfProcessor::generate_stump_hash(&path);
		assert!(hash.is_some());
	}

	#[test]
	fn test_generate_hashes() {
		let path = get_test_pdf_path();
		let options = FileProcessorOptions {
			generate_file_hashes: true,
			generate_koreader_hashes: true,
			..Default::default()
		};
		let hashes = PdfProcessor::generate_hashes(&path, options);
		assert!(hashes.is_ok());
		let hashes = hashes.unwrap();
		assert!(hashes.hash.is_some());
		assert!(hashes.koreader_hash.is_some());
	}

	#[test]
	fn test_analyze_page() {
		if PdfProcessor::renderer(&None).is_err() {
			eprintln!("Skipping test: PDFium is not configured or available.");
			return;
		}
		let path = get_test_pdf_path();
		let config = StumpConfig::debug();
		let page = PdfProcessor::analyze_page(&path, 1, &config);
		assert!(page.is_ok());
		let page = page.unwrap();
		assert!(page.width > 0);
		assert!(page.height > 0);
	}

	#[tokio::test]
	async fn test_get_page_async() {
		if PdfProcessor::renderer(&None).is_err() {
			eprintln!("Skipping test: PDFium is not configured or available.");
			return;
		}
		let path = get_test_pdf_path();
		let config = StumpConfig::debug();

		// Test without cache
		let mut no_cache_config = config.clone();
		no_cache_config.pdf_cache_pages = false;
		let result = PdfProcessor::get_page_async(&path, 1, &no_cache_config).await;
		assert!(result.is_ok());

		// Test with cache enabled
		let mut cache_config = config.clone();
		cache_config.pdf_cache_pages = true;
		let temp_dir = tempfile::tempdir().unwrap();
		cache_config.config_dir = temp_dir.path().to_string_lossy().to_string();

		let result1 = PdfProcessor::get_page_async(&path, 1, &cache_config).await;
		assert!(result1.is_ok());

		// Second call should hit cache and yield identical output
		let result2 = PdfProcessor::get_page_async(&path, 1, &cache_config).await;
		assert!(result2.is_ok());
		assert_eq!(result1.unwrap().1, result2.unwrap().1);
	}

	#[tokio::test]
	async fn test_prerender_adjacent_pages() {
		if PdfProcessor::renderer(&None).is_err() {
			eprintln!("Skipping test: PDFium is not configured or available.");
			return;
		}
		let path = get_test_pdf_path();
		let mut config = StumpConfig::debug();
		config.pdf_cache_pages = true;
		config.pdf_prerender_range = 1;
		let temp_dir = tempfile::tempdir().unwrap();
		config.config_dir = temp_dir.path().to_string_lossy().to_string();

		// This will pre-render page 2 in the background when requesting page 1
		let result = PdfProcessor::get_page_async(&path, 1, &config).await;
		assert!(result.is_ok());

		// Now check if page 2 was successfully cached (poll to prevent timing flakiness under load)
		let cache_key = PdfProcessor::generate_cache_key(&path, 2, &config).unwrap();
		let output_format = config.get_pdf_render_format();
		let cache_file = config.get_pdf_cache_dir().join(format!(
			"{}.{}",
			cache_key,
			output_format.extension()
		));

		let mut success = false;
		for _ in 0..100 {
			if cache_file.exists()
				&& cache_file.metadata().map(|m| m.len() > 0).unwrap_or(false)
			{
				success = true;
				break;
			}
			tokio::time::sleep(std::time::Duration::from_millis(100)).await;
		}
		assert!(success);
	}

	#[test]
	fn test_to_zip() {
		if PdfProcessor::renderer(&None).is_err() {
			eprintln!("Skipping test: PDFium is not configured or available.");
			return;
		}
		let path = get_test_pdf_path();
		let config = StumpConfig::debug();
		let result = PdfProcessor::to_zip(&path, false, None, &config);
		assert!(result.is_ok());
		let zip_path = result.unwrap();
		assert!(zip_path.exists());
		if zip_path.exists() {
			let _ = std::fs::remove_file(zip_path);
		}
	}
}
