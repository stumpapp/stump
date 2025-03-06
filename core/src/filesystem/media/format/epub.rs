use merge::Merge;
use quick_xml::{events::Event, Reader};
use std::{collections::HashMap, fs::File, io::BufReader, path::PathBuf};

const ACCEPTED_EPUB_COVER_MIMES: [&str; 2] = ["image/jpeg", "image/png"];
const DEFAULT_EPUB_COVER_ID: &str = "cover";

use crate::{
	config::StumpConfig,
	db::entity::MediaMetadata,
	filesystem::{
		content_type::ContentType,
		error::FileError,
		hash::{self, generate_koreader_hash},
		media::process::{FileProcessor, FileProcessorOptions, ProcessedFile},
		ProcessedFileHashes,
	},
};
use epub::doc::EpubDoc;

// TODO: lots of smells in this file, needs a touch up :)

/// A file processor for EPUB files.
pub struct EpubProcessor;

impl FileProcessor for EpubProcessor {
	fn get_sample_size(file: &str) -> Result<u64, FileError> {
		let mut epub_file = Self::open(file)?;

		let mut sample_size = 0;
		let page_count = epub_file.get_num_pages();

		for i in 0..page_count {
			if i > 5 {
				break;
			}

			if i > 0 {
				epub_file.set_current_page(i);
			}

			let (chapter_buffer, _) = epub_file.get_current().ok_or_else(|| {
				FileError::EpubReadError(
					"Failed to get chapter from epub file".to_string(),
				)
			})?;
			let chapter_size = chapter_buffer.len() as u64;

			sample_size += chapter_size;
		}

		Ok(sample_size)
	}

	fn generate_stump_hash(path: &str) -> Option<String> {
		let sample_result = EpubProcessor::get_sample_size(path);

		if let Ok(sample) = sample_result {
			match hash::generate(path, sample) {
				Ok(digest) => Some(digest),
				Err(e) => {
					tracing::debug!(error = ?e, path, "Failed to digest epub file");
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
			.then(|| EpubProcessor::generate_stump_hash(path))
			.flatten();
		let koreader_hash = generate_koreader_hashes
			.then(|| generate_koreader_hash(path))
			.transpose()?;

		Ok(ProcessedFileHashes {
			hash,
			koreader_hash,
		})
	}

	fn process(
		path: &str,
		options: FileProcessorOptions,
		_: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		tracing::debug!(?path, "processing epub");

		let mut processed_file = ProcessedFile {
			path: PathBuf::from(path),
			hash: None,
			koreader_hash: None,
			metadata: None,
			pages: 0,
		};

		if options.process_pages || options.process_metadata {
			let epub_file = Self::open(path)?;

			if options.process_pages {
				processed_file.pages = epub_file.get_num_pages() as i32;
			}
			// This still needs to be changed to take epub_file
			if options.process_metadata {
				processed_file.metadata = Self::process_metadata(path, epub_file)?;
			}
		};

		if options.generate_file_hashes || options.generate_koreader_hashes {
			let ProcessedFileHashes {
				hash,
				koreader_hash,
			} = Self::generate_hashes(path, options)?;
			if options.generate_file_hashes {
				processed_file.hash = hash;
			}
			if options.generate_koreader_hashes {
				processed_file.koreader_hash = koreader_hash;
			}
		};

		Ok(processed_file)
	}

	fn get_page(
		path: &str,
		page: i32,
		_: &StumpConfig,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		if page == 1 {
			// Assume this is the cover page
			EpubProcessor::get_cover(path)
		} else {
			EpubProcessor::get_chapter(path, page as usize)
		}
	}

	fn get_page_count(path: &str, _: &StumpConfig) -> Result<i32, FileError> {
		// TODO At present, this likely does not return the correct count of
		// pages. It should be updated when a better method is determined.
		let epub_file = Self::open(path)?;
		let pages = epub_file.get_num_pages() as i32;

		Ok(pages)
	}

	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		let mut epub_file = Self::open(path)?;

		let mut content_types = HashMap::new();

		for chapter in pages {
			if chapter == 1 {
				// Assume this is the cover page
				let (content_type, _) = Self::get_cover_internal(&mut epub_file)?;
				content_types.insert(chapter, content_type);
				continue;
			}

			if !epub_file.set_current_page(chapter as usize) {
				tracing::error!(path, chapter, "Failed to get chapter from epub file!");
				return Err(FileError::EpubReadError(
					"Failed to get chapter from epub file".to_string(),
				));
			}

			let content_type = if let Some(mime) = epub_file.get_current_mime() {
				ContentType::from(mime.as_str())
			} else {
				tracing::error!(
					chapter_path = ?path,
					"Failed to get explicit resource mime for chapter. Returning XHTML",
				);

				ContentType::XHTML
			};

			content_types.insert(chapter, content_type);
		}

		Ok(content_types)
	}
}

impl EpubProcessor {
	pub fn open(path: &str) -> Result<EpubDoc<BufReader<File>>, FileError> {
		EpubDoc::new(path).map_err(|e| FileError::EpubOpenError(e.to_string()))
	}

	pub fn process_metadata(
		path: &str,
		epub_file: EpubDoc<BufReader<File>>,
	) -> Result<Option<MediaMetadata>, FileError> {
		let embedded_metadata = MediaMetadata::from(epub_file.metadata);

		// try get opf file
		let file_path = std::path::Path::new(path).with_extension("opf");
		if file_path.exists() {
			// extract OPF data
			let opf_string = std::fs::read_to_string(file_path)?;
			let mut reader = Reader::from_str(opf_string.as_str());
			reader.config_mut().trim_text(true);
			let mut current_tag = String::new();

			let mut opf_metadata: HashMap<String, Vec<String>> = HashMap::new();

			while let Ok(event) = reader.read_event() {
				match event {
					Event::Start(ref e) | Event::Empty(ref e) => {
						let tag_name =
							String::from_utf8_lossy(e.name().as_ref()).to_string();

						// normalize tags
						current_tag = tag_name
							.strip_prefix("dc:")
							.unwrap_or(tag_name.as_str())
							.to_string();

						if let Some(attr) =
							e.attributes().filter_map(|a| a.ok()).find(|a| {
								a.key.as_ref() == b"property" || a.key.as_ref() == b"name"
							}) {
							current_tag = format!(
								"{}: {}",
								current_tag,
								String::from_utf8_lossy(&attr.value)
							);
						}
					},
					Event::Text(e) => {
						if let Ok(text) = e.unescape() {
							opf_metadata
								.entry(current_tag.clone())
								.or_default()
								.push(text.to_string());
						}
					},
					Event::Eof => {
						break;
					},
					_ => {},
				}
			}

			// merge opf and embedded, prioritizing opf
			let opf_metadata = MediaMetadata::from(opf_metadata);
			let mut combined_metadata = opf_metadata.clone();

			combined_metadata.id = opf_metadata.id;
			combined_metadata.merge(embedded_metadata);

			return Ok(Some(combined_metadata));
		}

		Ok(Some(embedded_metadata))
	}

	fn get_cover_path(resources: &HashMap<String, (PathBuf, String)>) -> Option<String> {
		let search_result = resources
			.iter()
			.filter(|(_, (_, mime))| {
				ACCEPTED_EPUB_COVER_MIMES
					.iter()
					.any(|accepted_mime| accepted_mime == mime)
			})
			.map(|(id, (path, _))| {
				tracing::trace!(name = ?path, "Found possible cover image");
				// I want to weight the results based on how likely they are to be the cover.
				// For example, if the cover is named "cover.jpg", it's probably the cover.

				// png's are preferred over jpg's
				// highest ranked cover is a top level "cover.png"
				// next highest ranked cover is any file starting with "cover"
				// next highest ranked cover is any file ending with "cover"
				// TODO: add more other fallbacks
				//  - parse the first html file and look for the first image
				//  - check for images that have a ratio between [1.4, 1.6]
				let path_str = path.to_string_lossy().to_lowercase();
				let extension = path
					.extension()
					.unwrap_or_default()
					.to_string_lossy()
					.to_lowercase();
				let file_stem =
					path.file_stem().unwrap().to_string_lossy().to_lowercase();

				if path_str.starts_with("cover") {
					let weight = if extension == "png" { 100 } else { 75 };
					(weight, id)
				} else if file_stem.starts_with("cover") {
					let weight = if extension == "png" { 65 } else { 55 };
					(weight, id)
				} else if file_stem.ends_with("cover") {
					let weight = if extension == "png" { 45 } else { 35 };
					(weight, id)
				} else {
					(0, id)
				}
			})
			.max_by_key(|(weight, _)| *weight);

		// if an image was found but weight is 0, then collect all images, sort by name, and return the first one
		if let Some((0, _)) = search_result {
			let mut sorted = resources
				.iter()
				.filter(|(_, (_, mime))| {
					ACCEPTED_EPUB_COVER_MIMES
						.iter()
						.any(|accepted_mime| accepted_mime == mime)
				})
				.collect::<Vec<_>>();
			sorted.sort_by(|(a, _), (b, _)| a.cmp(b));
			return sorted.first().map(|(id, _)| id.to_string());
		}

		if let Some((_, id)) = search_result {
			return Some(id.to_string());
		}

		None
	}

	fn get_cover_internal(
		epub_file: &mut EpubDoc<BufReader<File>>,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let cover_id = epub_file.get_cover_id().unwrap_or_else(|| {
			tracing::debug!("Epub file does not contain cover metadata");
			DEFAULT_EPUB_COVER_ID.to_string()
		});

		if let Some((buf, mime)) = epub_file.get_resource(&cover_id) {
			return Ok((ContentType::from(mime.as_str()), buf));
		}

		tracing::debug!(
			"Explicit cover image could not be found, falling back to searching for best match..."
		);
		let id = Self::get_cover_path(&epub_file.resources);
		if let Some(id) = id {
			if let Some((buf, mime)) = epub_file.get_resource(id.as_str()) {
				return Ok((ContentType::from(mime.as_str()), buf));
			}
		}
		tracing::error!("Failed to find cover for epub file");
		Err(FileError::EpubReadError(
			"Failed to find cover for epub file".to_string(),
		))
	}

	/// Returns the cover image for the epub file. If a cover image cannot be extracted via the
	/// metadata, it will go through two rounds of fallback methods:
	///
	/// 1. Attempt to find a resource with the default ID of "cover"
	/// 2. Attempt to find a resource with a mime type of "image/jpeg" or "image/png", and weight the
	///    results based on how likely they are to be the cover. For example, if the cover is named
	///    "cover.jpg", it's probably the cover. The entry with the highest weight, if any, will be
	///    returned.
	pub fn get_cover(path: &str) -> Result<(ContentType, Vec<u8>), FileError> {
		let mut epub_file = EpubDoc::new(path).map_err(|e| {
			tracing::error!("Failed to open epub file: {e}");
			FileError::EpubOpenError(e.to_string())
		})?;

		EpubProcessor::get_cover_internal(&mut epub_file)
	}

	pub fn get_chapter(
		path: &str,
		chapter: usize,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let mut epub_file = Self::open(path)?;

		if !epub_file.set_current_page(chapter) {
			tracing::error!(path, chapter, "Failed to get chapter from epub file!");
			return Err(FileError::EpubReadError(
				"Failed to get chapter from epub file".to_string(),
			));
		}

		let content = epub_file.get_current_with_epub_uris().map_err(|e| {
			tracing::error!("Failed to get chapter from epub file: {e}");
			FileError::EpubReadError(e.to_string())
		})?;

		let content_type = if let Some(mime) = epub_file.get_current_mime() {
			ContentType::from(mime.as_str())
		} else {
			tracing::error!(
				chapter_path = ?path,
				"Failed to get explicit resource mime for chapter. Returning XHTML",
			);

			ContentType::XHTML
		};

		Ok((content_type, content))
	}

	pub fn get_resource_by_id(
		path: &str,
		resource_id: &str,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let mut epub_file = Self::open(path)?;

		let (buf, mime) = epub_file.get_resource(resource_id).ok_or_else(|| {
			tracing::error!("Failed to get resource: {resource_id}");
			FileError::EpubReadError("Failed to get resource".to_string())
		})?;

		Ok((ContentType::from(mime.as_str()), buf))
	}

	pub fn get_resource_by_path(
		path: &str,
		root: &str,
		resource_path: PathBuf,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let mut epub_file = Self::open(path)?;

		let adjusted_path = normalize_resource_path(resource_path, root);

		let contents = epub_file
			.get_resource_by_path(adjusted_path.as_path())
			.ok_or_else(|| {
				tracing::error!(?adjusted_path, "Failed to get resource!");
				FileError::EpubReadError("Failed to get resource".to_string())
			})?;

		// Note: If the resource does not have an entry in the `resources` map, then loading the content
		// type will fail. This seems to only happen when loading the root file (e.g. container.xml,
		// package.opf, etc.).
		let content_type = if let Some(mime) =
			epub_file.get_resource_mime_by_path(adjusted_path.as_path())
		{
			ContentType::from(mime.as_str())
		} else {
			tracing::warn!(
				?adjusted_path,
				"Failed to get explicit definition of resource mime",
			);

			ContentType::from_path(adjusted_path.as_path())
		};

		Ok((content_type, contents))
	}

	// TODO: write me, maybe using https://docs.rs/regex/latest/regex/
	pub fn sanitize_html(
		base_url: &str,
		root: PathBuf,
		content: Vec<u8>,
	) -> Result<Vec<u8>, FileError> {
		// replace all src attributes with `{epubBaseURl}/{root}/{src}`
		// replace all href attributes with `{epubBaseURl}/{root}/{href}`
		// base_url/root/
		let _resolved_base = PathBuf::from(base_url).join(root);

		// 1. convert to string
		// 2. match all elements with src or href attributes
		// 3. iterate over all elements
		// 4. if element has src or href attribute, replace it
		// 5. convert back to string
		// 6. convert back to bytes

		let content_str = String::from_utf8(content).map_err(|e| {
			tracing::error!(error = ?e, "Failed to HTML buffer content to string");
			FileError::EpubReadError(e.to_string())
		})?;

		// use regex to replace all src and href attributes, e.g. invalid_elements = content_str.match(/src="[^"]+"/g)
		// for each invalid_element, replace it with the correct value
		// e.g. content_str.replace(invalid_element, `src="${epub_base_url}/${root}/${invalid_element}"`)

		let content_bytes = content_str.as_bytes().to_vec();

		Ok(content_bytes)
	}
}

pub(crate) fn normalize_resource_path(path: PathBuf, root: &str) -> PathBuf {
	let mut adjusted_path = path.clone();

	if !adjusted_path.starts_with(root) {
		adjusted_path = PathBuf::from(root).join(adjusted_path);
	}

	let mut normalized = PathBuf::new();
	for component in adjusted_path.components() {
		match component {
			std::path::Component::Normal(c) => normalized.push(c),
			std::path::Component::CurDir => {},
			std::path::Component::ParentDir => {
				if normalized.pop() {
				} else {
					return path;
				}
			},
			_ => {},
		}
	}

	normalized
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::filesystem::media::tests::get_test_epub_path;

	#[test]
	fn test_get_cover_first_sorted_image() {
		let resources = HashMap::from([
			(
				"id4".to_string(),
				(PathBuf::from("Image0001.jpg"), "image/jpeg".to_string()),
			),
			(
				"id5".to_string(),
				(PathBuf::from("Image0002.jpg"), "image/jpeg".to_string()),
			),
			(
				"id6".to_string(),
				(PathBuf::from("Image0003.jpg"), "image/jpeg".to_string()),
			),
		]);
		assert_eq!(
			EpubProcessor::get_cover_path(&resources),
			Some("id4".to_string())
		);
	}

	#[test]
	fn test_get_resource_by_id() {
		let path = get_test_epub_path();

		let resource = EpubProcessor::get_resource_by_id(&path, "item1");
		assert!(resource.is_ok());
	}

	#[test]
	fn test_get_cover_path_no_resources() {
		let resources = HashMap::<String, (PathBuf, String)>::new();
		assert_eq!(EpubProcessor::get_cover_path(&resources), None);
	}

	#[test]
	fn test_get_cover_path_single_resource() {
		let resources = HashMap::from([(
			"id1".to_string(),
			(PathBuf::from("cover.png"), "image/png".to_string()),
		)]);
		assert_eq!(
			EpubProcessor::get_cover_path(&resources),
			Some("id1".to_string())
		);
	}

	#[test]
	fn test_get_cover_path_multiple_resources() {
		let resources = HashMap::from([
			(
				"id1".to_string(),
				(PathBuf::from("cover.png"), "image/png".to_string()),
			),
			(
				"id2".to_string(),
				(PathBuf::from("not_cover.png"), "image/png".to_string()),
			),
		]);
		assert_eq!(
			EpubProcessor::get_cover_path(&resources),
			Some("id1".to_string())
		);
	}

	#[test]
	fn test_get_cover_prefer_png() {
		let resources = HashMap::from([
			(
				"id1".to_string(),
				(PathBuf::from("cover1.png"), "image/png".to_string()),
			),
			(
				"id2".to_string(),
				(PathBuf::from("cover2.jpg"), "image/jpeg".to_string()),
			),
		]);
		assert_eq!(
			EpubProcessor::get_cover_path(&resources),
			Some("id1".to_string())
		);
	}

	#[test]
	fn test_get_cover_path_cover_named() {
		let resources = HashMap::from([
			(
				"id1".to_string(),
				(
					PathBuf::from("path/images/cover.png"),
					"image/png".to_string(),
				),
			),
			(
				"id2".to_string(),
				(
					PathBuf::from("path/images/not_cover.png"),
					"image/png".to_string(),
				),
			),
		]);
		assert_eq!(
			EpubProcessor::get_cover_path(&resources),
			Some("id1".to_string())
		);
	}

	#[test]
	fn test_get_cover_path_cover_named_with_weighting() {
		let mut resources = HashMap::<String, (PathBuf, String)>::new();
		resources.insert(
			"id1".to_string(),
			(PathBuf::from("path/to/cover.png"), "image/png".to_string()),
		);
		resources.insert(
			"id2".to_string(),
			(PathBuf::from("path/to/cover.jpg"), "image/jpeg".to_string()),
		);
		assert_eq!(
			EpubProcessor::get_cover_path(&resources),
			Some("id1".to_string())
		);
	}

	#[test]
	fn test_get_cover_path_multiple_covers() {
		let mut resources = HashMap::<String, (PathBuf, String)>::new();
		resources.insert(
			"id1".to_string(),
			(PathBuf::from("cover.png"), "image/png".to_string()),
		);
		resources.insert(
			"id2".to_string(),
			(PathBuf::from("path/to/cover.jpg"), "image/jpeg".to_string()),
		);
		resources.insert(
			"id3".to_string(),
			(
				PathBuf::from("path/to/not_cover.jpg"),
				"image/jpeg".to_string(),
			),
		);
		assert_eq!(
			EpubProcessor::get_cover_path(&resources),
			Some("id1".to_string())
		);
	}

	#[test]
	fn test_normalize_resource_path() {
		let path = PathBuf::from("OEBPS/Styles/style.css");
		let result = normalize_resource_path(path, "OEBPS");
		assert_eq!(result, PathBuf::from("OEBPS/Styles/style.css"));

		let path = PathBuf::from("Styles/style.css");
		let result = normalize_resource_path(path, "OEBPS");
		assert_eq!(result, PathBuf::from("OEBPS/Styles/style.css"));

		let path = PathBuf::from("Styles/./style.css");
		let result = normalize_resource_path(path, "OEBPS");
		assert_eq!(result, PathBuf::from("OEBPS/Styles/style.css"));

		let path = PathBuf::from("../Styles/style.css");
		let result = normalize_resource_path(path, "OEBPS");
		assert_eq!(result, PathBuf::from("Styles/style.css"));

		let path = PathBuf::from("chapter1/../Styles/style.css");
		let result = normalize_resource_path(path, "OEBPS");
		assert_eq!(result, PathBuf::from("OEBPS/Styles/style.css"));

		let path = PathBuf::from("chapters/chapter1/../../Styles/style.css");
		let result = normalize_resource_path(path, "OEBPS");
		assert_eq!(result, PathBuf::from("OEBPS/Styles/style.css"));
	}

	#[test]
	fn test_process() {
		let path = get_test_epub_path();
		let config = StumpConfig::debug();

		let processed_file = EpubProcessor::process(
			&path,
			FileProcessorOptions {
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
		let processed_file = processed_file.unwrap();
		assert!(processed_file.hash.is_none());
		assert!(processed_file.koreader_hash.is_none());
		assert!(processed_file.metadata.is_none());
		assert_eq!(processed_file.pages, 0);

		let processed_file = EpubProcessor::process(
			&path,
			FileProcessorOptions {
				generate_file_hashes: true,
				generate_koreader_hashes: true,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
		let processed_file = processed_file.unwrap();
		assert!(processed_file.hash.is_some());
		assert!(processed_file.koreader_hash.is_some());
		assert!(processed_file.metadata.is_none());
		assert_eq!(processed_file.pages, 0);

		let processed_file = EpubProcessor::process(
			&path,
			FileProcessorOptions {
				process_metadata: true,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
		let processed_file = processed_file.unwrap();
		assert!(processed_file.hash.is_none());
		assert!(processed_file.koreader_hash.is_none());
		assert!(processed_file.metadata.is_some());
		assert_eq!(processed_file.pages, 0);

		let processed_file = EpubProcessor::process(
			&path,
			FileProcessorOptions {
				process_pages: true,
				..Default::default()
			},
			&config,
		);
		assert!(processed_file.is_ok());
		let processed_file = processed_file.unwrap();
		assert!(processed_file.hash.is_none());
		assert!(processed_file.koreader_hash.is_none());
		assert!(processed_file.metadata.is_none());
		assert_ne!(processed_file.pages, 0);
	}

	#[test]
	fn test_process_metadata() {
		let path = get_test_epub_path();
		let epub_file = EpubProcessor::open(&path).unwrap();

		let processed_metadata = EpubProcessor::process_metadata(&path, epub_file);
		match processed_metadata {
			Ok(Some(metadata)) => {
				assert_eq!(
					metadata.title,
					Some("Alice's Adventures in Wonderland - Test OPF".to_string())
				);
				assert_eq!(metadata.writers, Some(vec!["Lewis Carroll".to_string()]));
			},
			Ok(None) => panic!("No metadata returned"),
			Err(e) => panic!("Failed to get metadata: {:?}", e),
		}
	}

	#[test]
	fn test_get_page_content_types() {
		let path = get_test_epub_path();

		let cover = EpubProcessor::get_page_content_types(&path, vec![1]);
		assert!(cover.is_ok());
	}

	#[test]
	fn test_get_cover() {
		let path = get_test_epub_path();

		let cover = EpubProcessor::get_cover(&path);
		assert!(cover.is_ok());
	}

	#[test]
	fn test_get_chapter() {
		let path = get_test_epub_path();

		let chapter = EpubProcessor::get_chapter(&path, 1);
		assert!(chapter.is_ok());
	}

	#[test]
	fn test_get_cover_then_chapter() {
		let path = get_test_epub_path();

		let cover = EpubProcessor::get_cover(&path);
		assert!(cover.is_ok());
		let chapter = EpubProcessor::get_chapter(&path, 1);
		assert!(chapter.is_ok());
	}
}
