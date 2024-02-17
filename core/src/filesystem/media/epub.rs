use std::{collections::HashMap, fs::File, io::BufReader, path::PathBuf};

const ACCEPTED_EPUB_COVER_MIMES: [&str; 2] = ["image/jpeg", "image/png"];
const DEFAULT_EPUB_COVER_ID: &str = "cover";

use crate::{
	config::StumpConfig,
	db::entity::MediaMetadata,
	filesystem::{content_type::ContentType, error::FileError, hash},
};
use epub::doc::EpubDoc;

use super::process::{FileProcessor, FileProcessorOptions, ProcessedFile};

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

	fn hash(path: &str) -> Option<String> {
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

	fn process(
		path: &str,
		_: FileProcessorOptions,
		_: &StumpConfig,
	) -> Result<ProcessedFile, FileError> {
		tracing::debug!(?path, "processing epub");

		let path_buf = PathBuf::from(path);
		let epub_file = Self::open(path)?;

		tracing::trace!(?epub_file.metadata, "Processing raw EPUB metadata");
		let pages = epub_file.get_num_pages() as i32;
		let metadata = MediaMetadata::from(epub_file.metadata);

		Ok(ProcessedFile {
			path: path_buf,
			hash: EpubProcessor::hash(path),
			metadata: Some(metadata),
			pages,
		})
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

	fn get_page_content_types(
		path: &str,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, FileError> {
		let mut epub_file = Self::open(path)?;

		let mut content_types = HashMap::new();

		for chapter in pages {
			if chapter == 1 {
				// Assume this is the cover page
				// FIXME: This is wrong. I just don't want to deal with it right now...
				content_types.insert(chapter, ContentType::JPEG);
				continue;
			}

			if !epub_file.set_current_page(chapter as usize) {
				tracing::error!(path, chapter, "Failed to get chapter from epub file!");
				return Err(FileError::EpubReadError(
					"Failed to get chapter from epub file".to_string(),
				));
			}

			let content_type = match epub_file.get_current_mime() {
				Some(mime) => ContentType::from(mime.as_str()),
				None => {
					tracing::error!(
						chapter_path = ?path,
						"Failed to get explicit resource mime for chapter. Returning XHTML",
					);

					ContentType::XHTML
				},
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

	/// Returns the cover image for the epub file. If a cover image cannot be extracted via the
	/// metadata, it will go through two rounds of fallback methods:
	///
	/// 1. Attempt to find a resource with the default ID of "cover"
	/// 2. Attempt to find a resource with a mime type of "image/jpeg" or "image/png", and weight the
	/// results based on how likely they are to be the cover. For example, if the cover is named
	/// "cover.jpg", it's probably the cover. The entry with the heighest weight, if any, will be
	/// returned.
	pub fn get_cover(path: &str) -> Result<(ContentType, Vec<u8>), FileError> {
		let mut epub_file = EpubDoc::new(path).map_err(|e| {
			tracing::error!("Failed to open epub file: {}", e);
			FileError::EpubOpenError(e.to_string())
		})?;

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
		// FIXME: this is hack, i do NOT want to clone this entire hashmap...
		let cloned_resources = epub_file.resources.clone();
		let search_result = cloned_resources
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
				// TODO: this is SUPER naive, and should be improved at some point...
				if path.starts_with("cover") {
					let weight = if path.ends_with("png") { 100 } else { 75 };
					(weight, id)
				} else {
					(0, id)
				}
			})
			.max_by_key(|(weight, _)| *weight);

		if let Some((_, id)) = search_result {
			if let Some((buf, mime)) = epub_file.get_resource(id) {
				return Ok((ContentType::from(mime.as_str()), buf));
			}
		}

		tracing::error!("Failed to find cover for epub file");
		Err(FileError::EpubReadError(
			"Failed to find cover for epub file".to_string(),
		))
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
			tracing::error!("Failed to get chapter from epub file: {}", e);
			FileError::EpubReadError(e.to_string())
		})?;

		let content_type = match epub_file.get_current_mime() {
			Some(mime) => ContentType::from(mime.as_str()),
			None => {
				tracing::error!(
					chapter_path = ?path,
					"Failed to get explicit resource mime for chapter. Returning XHTML",
				);

				ContentType::XHTML
			},
		};

		Ok((content_type, content))
	}

	pub fn get_resource_by_id(
		path: &str,
		resource_id: &str,
	) -> Result<(ContentType, Vec<u8>), FileError> {
		let mut epub_file = Self::open(path)?;

		let (buf, mime) = epub_file.get_resource(resource_id).ok_or_else(|| {
			tracing::error!("Failed to get resource: {}", resource_id);
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
		let content_type =
			match epub_file.get_resource_mime_by_path(adjusted_path.as_path()) {
				Some(mime) => ContentType::from(mime.as_str()),
				None => {
					tracing::warn!(
						?adjusted_path,
						"Failed to get explicit definition of resource mime",
					);

					ContentType::from_path(adjusted_path.as_path())
				},
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
		let resolved_base = PathBuf::from(base_url).join(root);
		dbg!(resolved_base);

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
	let mut adjusted_path = path;

	if !adjusted_path.starts_with(root) {
		adjusted_path = PathBuf::from(root).join(adjusted_path);
	}

	//  This below won't work since these paths are INSIDE the epub file >:(
	// adjusted_path = adjusted_path.canonicalize().unwrap_or_else(|err| {
	// 	// tracing::warn!(
	// 	// 	"Failed to safely canonicalize path {}: {}",
	// 	// 	adjusted_path.display(),
	// 	// 	err
	// 	// );

	// 	tracing::warn!(
	// 		"Failed to safely canonicalize path {}: {}",
	// 		adjusted_path.display(),
	// 		err
	// 	);
	// 	adjusted_path
	// });

	// FIXME: This actually is an invalid solution. If I have multiple '/../../' in the path, this will
	// result in an incorrect path. I'm not worrying about it now, as I don't believe this will even
	// be an issue in the context of epub resources, however once the below linked rust feature is completed
	// I will replace this gross solution.
	let adjusted_str = adjusted_path
		.to_string_lossy()
		.replace("/../", "/")
		.replace("\\..\\", "\\");

	// https://github.com/rust-lang/rust/issues/92750
	// std::path::absolute(adjusted_path);

	PathBuf::from(adjusted_str)
}
