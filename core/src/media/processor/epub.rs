use merge::Merge;
use quick_xml::{escape::unescape, events::Event, Reader};
use std::{
	collections::HashMap,
	fs::File,
	io::BufReader,
	path::{Path, PathBuf},
};

const ACCEPTED_EPUB_COVER_MIMES: [&str; 2] = ["image/jpeg", "image/png"];
const DEFAULT_EPUB_COVER_ID: &str = "cover";

use epub::doc::EpubDoc;

use crate::{
	fs_utils::{
		hash::{self, generate_koreader_hash},
		ContentType,
	},
	media::{
		metadata::ProcessedMediaMetadata,
		processor::{
			error::MediaProcessorError, AnalyzedPage, GeneratedFileHashes,
			MediaProcessor, MediaProcessorOptions, ProcessedMediaFile,
		},
	},
};

/// A file processor for EPUB files
pub struct EpubProcessor;

impl MediaProcessor for EpubProcessor {
	fn generate_stump_hash(&self, path: &Path) -> Result<String, MediaProcessorError> {
		let mut epub_file = EpubDoc::new(path)?;

		let mut sample_size = 0;
		let page_count = epub_file.get_num_chapters();

		for i in 0..page_count {
			if i > 5 {
				break;
			}

			if i > 0 {
				epub_file.set_current_chapter(i);
			}

			let (chapter_buffer, _) = epub_file.get_current().ok_or_else(|| {
				MediaProcessorError::EpubRead(
					"Failed to get chapter from epub file".to_string(),
				)
			})?;
			let chapter_size = chapter_buffer.len() as u64;

			sample_size += chapter_size;
		}

		Ok(hash::generate(path, sample_size)?)
	}

	fn generate_hashes(
		&self,
		path: &Path,
		MediaProcessorOptions {
			generate_file_hashes,
			generate_koreader_hashes,
			..
		}: MediaProcessorOptions,
	) -> Result<GeneratedFileHashes, MediaProcessorError> {
		let stump_hash = generate_file_hashes
			.then(|| self.generate_stump_hash(path))
			.transpose()?;
		let koreader_hash = generate_koreader_hashes
			.then(|| generate_koreader_hash(path))
			.transpose()?;

		Ok(GeneratedFileHashes {
			stump: stump_hash,
			koreader: koreader_hash,
		})
	}

	fn process_metadata(
		&self,
		path: &Path,
	) -> Result<Option<ProcessedMediaMetadata>, MediaProcessorError> {
		let mut epub_file = EpubDoc::new(path)?;
		let metadata_map = metadata_to_map(epub_file.metadata.clone());
		let mut embedded_metadata = ProcessedMediaMetadata::from(metadata_map);

		tracing::trace!(before = ?embedded_metadata, "Processing embedded metadata");

		let root_file_path = epub_file.root_file.clone();
		if let Some(Ok(parsed_embedded_metadata)) = epub_file
			.get_resource_str_by_path(&root_file_path)
			.map(|xml| parse_opf_xml(&xml))
		{
			let additional_metadata =
				ProcessedMediaMetadata::from(parsed_embedded_metadata);
			// Prioritize the additional over epub-rs since it is less comprehensive
			embedded_metadata.merge(additional_metadata);
		}

		tracing::trace!(after = ?embedded_metadata, "Merged embedded metadata");

		let file_path = path.with_extension("opf");
		if file_path.exists() {
			let opf_string = std::fs::read_to_string(file_path)?;
			let opf_metadata = parse_opf_xml(&opf_string)?;

			// Prioritize the OPF metadata over the embedded metadata
			let opf_metadata = ProcessedMediaMetadata::from(opf_metadata);
			let mut combined_metadata = opf_metadata.clone();

			combined_metadata.merge(embedded_metadata);

			return Ok(Some(combined_metadata));
		}

		Ok(Some(embedded_metadata))
	}

	fn process(
		&self,
		path: &Path,
		options: MediaProcessorOptions,
	) -> Result<ProcessedMediaFile, MediaProcessorError> {
		tracing::trace!(?path, "Processing epub");

		let metadata = self.process_metadata(path);

		let mut epub_file = EpubDoc::new(path)?;
		let pages = compute_synthetic_page_count(&mut epub_file)?;

		// Get metadata from epub file if process_metadata failed
		let metadata = match metadata {
			Ok(Some(m)) => m,
			result => {
				tracing::trace!(?result, "Falling back to epub-rs metadata");
				let metadata_map = metadata_to_map(epub_file.metadata);
				ProcessedMediaMetadata::from(metadata_map)
			},
		};

		let hashes = self.generate_hashes(path, options)?;

		Ok(ProcessedMediaFile {
			path: path.to_path_buf(),
			hash: hashes.stump,
			koreader_hash: hashes.koreader,
			metadata: Some(metadata),
			pages,
		})
	}

	fn get_page(
		&self,
		path: &Path,
		page: i32,
	) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
		if page == 1 {
			// Assume this is the cover page
			get_cover(path)
		} else {
			get_chapter(path, page as usize)
		}
	}

	fn get_page_count(&self, path: &Path) -> Result<i32, MediaProcessorError> {
		let mut epub_file = EpubDoc::new(path)?;
		compute_synthetic_page_count(&mut epub_file)
	}

	fn get_page_content_types(
		&self,
		path: &Path,
		pages: Vec<i32>,
	) -> Result<HashMap<i32, ContentType>, MediaProcessorError> {
		let mut epub_file = EpubDoc::new(path)?;

		let mut content_types = HashMap::new();

		for chapter in pages {
			if chapter == 1 {
				// Assume this is the cover page
				let (content_type, _) = get_cover_internal(&mut epub_file)?;
				content_types.insert(chapter, content_type);
				continue;
			}

			if !epub_file.set_current_chapter(chapter as usize) {
				tracing::error!(?path, chapter, "Failed to get chapter from epub file!");
				return Err(MediaProcessorError::EpubRead(
					"Failed to get chapter from epub file".to_string(),
				));
			}

			let content_type = if let Some(mime) = epub_file.get_current_mime() {
				mime.parse::<ContentType>().unwrap_or_default()
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

	fn analyze_page(
		&self,
		_path: &Path,
		_page: i32,
	) -> Result<AnalyzedPage, MediaProcessorError> {
		Err(MediaProcessorError::UnsupportedFile(
			"Epub page analysis is not supported".to_string(),
		))
	}
}

/// Compute the synthetic page count for Readium https://wiki.mobileread.com/wiki/Adobe_Digital_Editions#Page_numbers
fn compute_synthetic_page_count(
	epub_file: &mut EpubDoc<BufReader<File>>,
) -> Result<i32, MediaProcessorError> {
	let mut total_pages: i32 = 0;

	for spine_item in epub_file.spine.clone() {
		// Skip non-linear items (e.g. some epubs skip the cover by marking them as such, and Readium does not show these)
		if spine_item.linear {
			if let Some(compressed_size) =
				epub_file.get_resource_compressed_size(&spine_item.idref)
			{
				let pages = (compressed_size as f64 / 1024.0).ceil() as i32;
				total_pages += if pages == 0 { 1 } else { pages };
			}
		}
	}

	Ok(total_pages)
}

fn metadata_to_map(
	metadata: Vec<epub::doc::MetadataItem>,
) -> HashMap<String, Vec<String>> {
	let mut map: HashMap<String, Vec<String>> = HashMap::new();
	for item in metadata {
		map.entry(item.property).or_default().push(item.value);
	}
	map
}

fn get_cover_id_by_resource_alphabetically(
	resources: &HashMap<String, (PathBuf, String)>,
) -> Option<String> {
	resources
		.iter()
		.filter(|(_, (_, mime))| {
			ACCEPTED_EPUB_COVER_MIMES
				.iter()
				.any(|accepted_mime| accepted_mime == mime)
		})
		.min_by_key(|(id, _)| *id)
		.map(|(id, _)| id.to_string())
}

fn get_cover_id_by_resource_name(
	resources: &HashMap<String, (PathBuf, String)>,
) -> Option<String> {
	resources
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
			// next highest ranked cover is any file containing "cover"
			// TODO: add more other fallbacks
			//  - check for images that have a ratio between [1.4, 1.6]
			let path_str = path.to_string_lossy().to_lowercase();
			let extension = path
				.extension()
				.unwrap_or_default()
				.to_string_lossy()
				.to_lowercase();
			let file_stem = path.file_stem().unwrap().to_string_lossy().to_lowercase();

			if path_str.starts_with("cover") {
				let weight = if extension == "png" { 100 } else { 75 };
				(weight, id)
			} else if file_stem.starts_with("cover") {
				let weight = if extension == "png" { 65 } else { 55 };
				(weight, id)
			} else if file_stem.ends_with("cover") {
				let weight = if extension == "png" { 45 } else { 35 };
				(weight, id)
			} else if file_stem.contains("cover") {
				let weight = if extension == "png" { 25 } else { 15 };
				(weight, id)
			} else {
				(0, id)
			}
		})
		// ignore images that do no contain cover in their name
		.filter(|&(weight, _)| weight > 0)
		// use id as a tiebreaker
		.max_by_key(|&(weight, id)| (weight, id))
		.map(|(_, id)| id.to_string())
}

fn get_cover_internal(
	epub_file: &mut EpubDoc<BufReader<File>>,
) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
	let cover_id = epub_file.get_cover_id().unwrap_or_else(|| {
		tracing::debug!("Epub file does not contain cover metadata");
		DEFAULT_EPUB_COVER_ID.to_string()
	});

	match epub_file.get_resource(&cover_id) {
		Some((buf, mime)) if mime.starts_with("image/") => {
			return Ok((mime.parse::<ContentType>().unwrap_or_default(), buf));
		},
		Some((_, mime)) => {
			tracing::debug!(
				?mime,
				"Found explicit cover image via metadata, but mime is not an image",
			);
		},
		_ => tracing::debug!("Epub file does not contain explicit cover resource"),
	}

	tracing::debug!(
		"Explicit cover image could not be found, falling back to searching for best match..."
	);
	if let Some((mime, buf)) = get_cover_by_reading_order(epub_file) {
		return Ok((mime.parse::<ContentType>().unwrap_or_default(), buf));
	}

	let resources_map: HashMap<String, (PathBuf, String)> = epub_file
		.resources
		.iter()
		.map(|(id, item)| (id.clone(), (item.path.clone(), item.mime.clone())))
		.collect();

	let id = get_cover_id_by_resource_name(&resources_map);
	if let Some(id) = id {
		if let Some((buf, mime)) = epub_file.get_resource(id.as_str()) {
			return Ok((mime.parse::<ContentType>().unwrap_or_default(), buf));
		}
	}

	let id = get_cover_id_by_resource_alphabetically(&resources_map);
	if let Some(id) = id {
		if let Some((buf, mime)) = epub_file.get_resource(id.as_str()) {
			return Ok((mime.parse::<ContentType>().unwrap_or_default(), buf));
		}
	}

	tracing::error!("Failed to find cover for epub file");
	Err(MediaProcessorError::EpubRead(
		"Failed to find cover for epub file".to_string(),
	))
}

/// Returns the cover image for the epub file. If a cover image cannot be extracted via the
/// metadata, it will go through four rounds of fallback methods:
///
/// 1. Attempt to find a resource with the default ID of "cover"
/// 2. Find the first image in the book by reading order.
/// 3. Attempt to find a resource with a mime type of "image/jpeg" or "image/png", and weight the
///    results based on how likely they are to be the cover. For example, if the cover is named
///    "cover.jpg", it's probably the cover. The entry with the highest weight, if any, will be
///    returned.
/// 4. Find the image with the alphabetically sorted first name.
pub fn get_cover(path: &Path) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
	let mut epub_file = EpubDoc::new(path)?;
	get_cover_internal(&mut epub_file)
}

pub fn get_chapter(
	path: &Path,
	chapter: usize,
) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
	let mut epub_file = EpubDoc::new(path)?;

	if !epub_file.set_current_chapter(chapter) {
		tracing::error!(?path, chapter, "Failed to get chapter from epub file!");
		return Err(MediaProcessorError::EpubRead(
			"Failed to get chapter from epub file".to_string(),
		));
	}

	let content = epub_file.get_current_with_epub_uris().map_err(|e| {
		tracing::error!("Failed to get chapter from epub file: {e}");
		MediaProcessorError::EpubRead(e.to_string())
	})?;

	let content_type = if let Some(mime) = epub_file.get_current_mime() {
		mime.parse::<ContentType>().unwrap_or_default()
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
	path: &Path,
	resource_id: &str,
) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
	let mut epub_file = EpubDoc::new(path)?;

	let (buf, mime) = epub_file.get_resource(resource_id).ok_or_else(|| {
		tracing::error!("Failed to get resource: {resource_id}");
		MediaProcessorError::EpubRead("Failed to get resource".to_string())
	})?;

	Ok((mime.parse::<ContentType>().unwrap_or_default(), buf))
}

#[tracing::instrument(err)]
pub fn get_resource_by_path(
	path: &Path,
	root: &str,
	resource_path: PathBuf,
) -> Result<(ContentType, Vec<u8>), MediaProcessorError> {
	let mut epub_file = EpubDoc::new(path)?;

	let adjusted_path = normalize_resource_path(resource_path.clone(), root);

	let contents = epub_file
		.get_resource_by_path(adjusted_path.as_path())
		.ok_or_else(|| {
			let available_resources: Vec<_> = epub_file
				.resources
				.values()
				.map(|r| r.path.to_string_lossy().to_string())
				.collect();
			tracing::error!(
				?adjusted_path,
				?available_resources,
				"Failed to get resource!"
			);
			MediaProcessorError::EpubRead("Failed to get resource".to_string())
		})?;

	// Note: If the resource does not have an entry in the `resources` map, then loading the content
	// type will fail. This seems to only happen when loading the root file (e.g. container.xml,
	// package.opf, etc.).
	let content_type = if let Some(mime) =
		epub_file.get_resource_mime_by_path(adjusted_path.as_path())
	{
		mime.parse::<ContentType>().unwrap_or_default()
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
) -> Result<Vec<u8>, MediaProcessorError> {
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
		MediaProcessorError::EpubRead(e.to_string())
	})?;

	// use regex to replace all src and href attributes, e.g. invalid_elements = content_str.match(/src="[^"]+"/g)
	// for each invalid_element, replace it with the correct value
	// e.g. content_str.replace(invalid_element, `src="${epub_base_url}/${root}/${invalid_element}"`)

	let content_bytes = content_str.as_bytes().to_vec();

	Ok(content_bytes)
}

fn get_cover_by_reading_order(
	epub_file: &mut EpubDoc<BufReader<File>>,
) -> Option<(String, Vec<u8>)> {
	let mut buf = Vec::new();

	// parse the xhtml files in order of the spine
	epub_file.spine.clone().into_iter().find_map(|spine_item| {
		epub_file
			.get_resource(&spine_item.idref)
			.and_then(|(data, _mime)| {
				if let Some(dir_path) = epub_file
					.resources
					.get(&spine_item.idref)
					.and_then(|r| r.path.parent())
					.map(|p| p.to_owned())
				{
					find_image_in_xhtml(epub_file, dir_path, &data, &mut buf)
				} else {
					None
				}
			})
	})
}

/// Find first img tag in a xhtml file.
/// In the case an error is encountered when accessing an image, the error is ignored and the image skipped.
fn find_image_in_xhtml(
	epub_file: &mut EpubDoc<BufReader<File>>,
	dir_path: PathBuf,
	file: &[u8],
	buf: &mut Vec<u8>,
) -> Option<(String, Vec<u8>)> {
	buf.clear();
	let mut reader = quick_xml::Reader::from_reader(std::io::Cursor::new(file));

	loop {
		match reader.read_event_into(buf).ok()? {
			quick_xml::events::Event::Eof => {
				return None;
			},
			quick_xml::events::Event::Empty(e) if e.name().as_ref() == b"img" => {
				if let Some(img_path) = e
					.try_get_attribute("src")
					.ok()
					.flatten()
					.and_then(|a| String::from_utf8(a.value.to_vec()).ok())
					.filter(|a| {
						["png", "jpg", "jpeg"]
							.iter()
							.any(|file_ending| a.to_lowercase().ends_with(file_ending))
					}) {
					// Assamble full path to access resource.
					let new_path = normalize_resource_path(
						PathBuf::from(img_path),
						&dir_path.to_string_lossy(),
					);

					// access resource directly because it is hard to get the resource id from a path
					if let Some(media_type) =
						epub_file.get_resource_mime_by_path(&new_path)
					{
						if let Some(data) = epub_file.get_resource_by_path(&new_path) {
							return Some((media_type, data));
						}
					}
				}
			},
			_ => (),
		}
		buf.clear();
	}
}

/// Parse OPF XML content and extract supported metadata
fn parse_opf_xml(
	opf_content: &str,
) -> Result<HashMap<String, Vec<String>>, MediaProcessorError> {
	let mut reader = Reader::from_str(opf_content);
	reader.config_mut().trim_text(true);
	let mut current_tag = String::new();
	let mut buf = Vec::new();
	let mut opf_metadata: HashMap<String, Vec<String>> = HashMap::new();

	// tags which _might_ contain html, will be handled differently if encountered
	const HTML_CONTENT_TAGS: [&str; 3] = ["description", "summary", "synopsis"];

	loop {
		let mut html_tag_to_read: Option<(String, String)> = None;

		match reader.read_event_into(&mut buf) {
			Ok(Event::Start(ref e)) => {
				let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
				let base_tag = tag_name
					.strip_prefix("dc:")
					.unwrap_or(tag_name.as_str())
					.to_string();

				if HTML_CONTENT_TAGS.contains(&base_tag.as_str()) {
					html_tag_to_read = Some((tag_name, base_tag));
				} else {
					current_tag = base_tag.clone();

					for attr in e.attributes().flatten() {
						match attr.key.as_ref() {
							b"opf:scheme" if base_tag == "identifier" => {
								let scheme =
									String::from_utf8_lossy(&attr.value).to_lowercase();
								current_tag = format!("identifier_{}", scheme);
							},
							b"name" if tag_name == "meta" => {
								let name = String::from_utf8_lossy(&attr.value);
								current_tag =
									name.trim_start_matches("calibre:").to_string();
							},
							b"property" if tag_name == "meta" => {
								let property = String::from_utf8_lossy(&attr.value);
								current_tag = property.to_string();
							},
							b"property" if tag_name == "opf:meta" => {
								let property = String::from_utf8_lossy(&attr.value);
								current_tag = property.to_string();
							},
							_ => {},
						}
					}
				}
			},
			Ok(Event::Empty(ref e)) => {
				let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();

				if tag_name == "meta" {
					let mut meta_name = String::new();
					let mut meta_content = String::new();

					for attr in e.attributes().flatten() {
						match attr.key.as_ref() {
							b"name" => {
								let name = String::from_utf8_lossy(&attr.value);
								meta_name =
									name.trim_start_matches("calibre:").to_string();
							},
							b"property" => {
								let property = String::from_utf8_lossy(&attr.value);
								meta_name = property.to_string();
							},
							b"content" => {
								meta_content = String::from_utf8_lossy(&attr.value)
									.trim()
									.to_string();
							},
							_ => {},
						}
					}

					if !meta_name.is_empty() && !meta_content.is_empty() {
						tracing::trace!(?meta_name, ?meta_content, "Found meta tag");
						opf_metadata
							.entry(meta_name)
							.or_default()
							.push(meta_content);
					}
				} else {
					let base_tag = tag_name
						.strip_prefix("dc:")
						.unwrap_or(tag_name.as_str())
						.to_string();

					let mut tag_key = base_tag.clone();
					let mut tag_content = String::new();

					for attr in e.attributes().flatten() {
						match attr.key.as_ref() {
							b"opf:scheme" if base_tag == "identifier" => {
								let scheme =
									String::from_utf8_lossy(&attr.value).to_lowercase();
								tag_key = format!("identifier_{}", scheme);
							},
							b"content" => {
								tag_content = String::from_utf8_lossy(&attr.value)
									.trim()
									.to_string();
							},
							_ => {},
						}
					}

					if !tag_key.is_empty() && !tag_content.is_empty() {
						opf_metadata.entry(tag_key).or_default().push(tag_content);
					}
				}
			},
			Ok(Event::Text(e)) => {
				if !current_tag.is_empty() {
					let text = String::from_utf8_lossy(&e).to_string();
					let content = text.trim().to_string();
					if !content.is_empty() {
						match current_tag.as_str() {
							"belongs-to-collection" => {
								opf_metadata
									.entry("collection_name".to_string())
									.or_default()
									.push(content.clone());
							},
							"collection-type" => {
								opf_metadata
									.entry("collection_type".to_string())
									.or_default()
									.push(content.clone());
							},
							"group-position" => {
								opf_metadata
									.entry("collection_position".to_string())
									.or_default()
									.push(content.clone());
							},
							"identifier" => {
								// Some books seem to have prefixed identifiers (e.g., "isbn:9780062444134")
								if let Some(colon_pos) = content.find(':') {
									let scheme = content[..colon_pos].to_lowercase();
									let value = content[colon_pos + 1..].to_string();
									let key = format!("identifier_{}", scheme);
									opf_metadata.entry(key).or_default().push(value);
								} else {
									// No prefix, treat as generic identifier
									opf_metadata
										.entry(current_tag.clone())
										.or_default()
										.push(content);
								}
							},
							_ => {
								opf_metadata
									.entry(current_tag.clone())
									.or_default()
									.push(content);
							},
						}
					}
				}
			},
			Ok(Event::End(_)) => {
				current_tag.clear();
			},
			Ok(Event::Eof) => break,
			Err(e) => {
				tracing::warn!("Error parsing OPF XML: {}", e);
				break;
			},
			_ => {},
		}

		if let Some((full_tag, base_tag)) = html_tag_to_read.take() {
			let end = quick_xml::events::BytesEnd::new(&full_tag);
			match reader.read_text(end.name()) {
				Ok(raw_text) => {
					let text = unescape(&raw_text)
						.map(|c| c.into_owned())
						.unwrap_or_else(|_| raw_text.into_owned());
					let trimmed = text.trim().to_string();

					if !trimmed.is_empty() {
						opf_metadata.entry(base_tag).or_default().push(trimmed);
					}
				},
				Err(e) => {
					tracing::warn!("Error reading {} content: {}", base_tag, e);
				},
			}
		}

		buf.clear();
	}

	tracing::trace!(?opf_metadata, "Extracted OPF metadata");
	Ok(opf_metadata)
}

pub(crate) fn normalize_resource_path(path: PathBuf, root: &str) -> PathBuf {
	let mut adjusted_path = path.clone();

	if !adjusted_path.starts_with(root) {
		adjusted_path = PathBuf::from(root).join(adjusted_path);
	}

	// TODO: Replace with normalize_lexically
	// https://doc.rust-lang.org/std/path/struct.Path.html#method.normalize_lexically
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
	fn test_get_cover_from_xhtml_svg_cover() {
		let epub_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests")
			.join("data")
			.join("book.epub");

		let mut epub = EpubDoc::new(epub_path).unwrap();

		// this test file references the cover image inside a svg
		assert_eq!(get_cover_by_reading_order(&mut epub), None);
	}

	#[test]
	fn test_get_cover_from_xhtml_img_cover() {
		let epub_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests")
			.join("data")
			.join("book_image_cover.epub");

		let mut epub = EpubDoc::new(epub_path).unwrap();

		assert!(
			get_cover_by_reading_order(&mut epub)
				== epub
					.get_resource("id-3324512750020140212")
					.map(|(data, mime)| (mime, data))
		);
	}

	#[test]
	fn test_get_cover_from_xhtml_img_cover_last_chapter() {
		let epub_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests")
			.join("data")
			.join("book_image_cover_last_chapter.epub");

		let mut epub = EpubDoc::new(epub_path).unwrap();

		assert!(
			get_cover_by_reading_order(&mut epub)
				== epub
					.get_resource("id-3324512750020140212")
					.map(|(data, mime)| (mime, data))
		);
	}

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
		assert_eq!(get_cover_id_by_resource_name(&resources), None);
		assert_eq!(
			get_cover_id_by_resource_alphabetically(&resources),
			Some("id4".to_string())
		);
	}

	#[test]
	fn test_get_resource_by_id() {
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);

		let resource = get_resource_by_id(path, "item1");
		assert!(resource.is_ok());
	}

	#[test]
	fn test_get_cover_path_no_resources() {
		let resources = HashMap::<String, (PathBuf, String)>::new();
		assert_eq!(get_cover_id_by_resource_name(&resources), None);
	}

	#[test]
	fn test_get_cover_path_single_resource() {
		let resources = HashMap::from([(
			"id1".to_string(),
			(PathBuf::from("cover.png"), "image/png".to_string()),
		)]);
		assert_eq!(
			get_cover_id_by_resource_name(&resources),
			Some("id1".to_string())
		);
		assert_eq!(
			get_cover_id_by_resource_alphabetically(&resources),
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
			get_cover_id_by_resource_name(&resources),
			Some("id1".to_string())
		);
		assert_eq!(
			get_cover_id_by_resource_alphabetically(&resources),
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
			get_cover_id_by_resource_name(&resources),
			Some("id1".to_string())
		);
		assert_eq!(
			get_cover_id_by_resource_alphabetically(&resources),
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
			get_cover_id_by_resource_name(&resources),
			Some("id1".to_string())
		);
		assert_eq!(
			get_cover_id_by_resource_alphabetically(&resources),
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
			get_cover_id_by_resource_name(&resources),
			Some("id1".to_string())
		);
		assert_eq!(
			get_cover_id_by_resource_alphabetically(&resources),
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
			get_cover_id_by_resource_name(&resources),
			Some("id1".to_string())
		);
		assert_eq!(
			get_cover_id_by_resource_alphabetically(&resources),
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
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);
		let processor = EpubProcessor;

		let processed_file = processor.process(
			path,
			MediaProcessorOptions {
				..Default::default()
			},
		);
		assert!(processed_file.is_ok());
	}

	#[test]
	fn test_process_metadata() {
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);
		let processor = EpubProcessor;

		let processed_metadata = processor.process_metadata(path);
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
	fn test_parse_calibre_opf() {
		let opf_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests")
			.join("data")
			.join("calibre.opf");

		let opf_content = std::fs::read_to_string(&opf_path)
			.expect("Failed to read calibre.opf test file");

		let metadata = parse_opf_xml(&opf_content).expect("Failed to parse calibre.opf");

		assert_eq!(
			metadata.get("title"),
			Some(&vec!["After the Funeral".to_string()])
		);
		assert_eq!(
			metadata.get("creator"),
			Some(&vec!["Agatha Christie".to_string()])
		);
		assert_eq!(
			metadata.get("publisher"),
			Some(&vec!["HarperCollins".to_string()])
		);
		assert_eq!(metadata.get("language"), Some(&vec!["eng".to_string()]));
		assert_eq!(
			metadata.get("date"),
			Some(&vec!["1953-02-28T18:30:00+00:00".to_string()])
		);

		let contributors = metadata
			.get("contributor")
			.expect("Should have contributor");
		assert_eq!(contributors.len(), 1);
		assert!(contributors[0].contains("calibre"));

		assert_eq!(
			metadata.get("identifier_calibre"),
			Some(&vec!["106".to_string()])
		);
		assert_eq!(
			metadata.get("identifier_uuid"),
			Some(&vec!["373c64ba-39fd-40b3-99ba-0223ebab0fec".to_string()])
		);
		assert_eq!(
			metadata.get("identifier_isbn"),
			Some(&vec!["9780007562695".to_string()])
		);
		assert_eq!(
			metadata.get("identifier_amazon"),
			Some(&vec!["0007562691".to_string()])
		);
		assert_eq!(
			metadata.get("identifier_goodreads"),
			Some(&vec!["60458674".to_string()])
		);

		let subjects = metadata.get("subject").expect("Should have subjects");
		assert_eq!(subjects.len(), 5);
		assert!(subjects.contains(&"Mystery".to_string()));
		assert!(subjects.contains(&"Crime".to_string()));
		assert!(subjects.contains(&"Classics".to_string()));
		assert!(subjects.contains(&"Thriller".to_string()));
		assert!(subjects.contains(&"Detective".to_string()));

		assert_eq!(
			metadata.get("series"),
			Some(&vec!["Hercule Poirot".to_string()])
		);
		assert_eq!(metadata.get("series_index"), Some(&vec!["33".to_string()]));
		assert_eq!(metadata.get("rating"), Some(&vec!["8".to_string()]));
		assert_eq!(
			metadata.get("title_sort"),
			Some(&vec!["After the Funeral".to_string()])
		);

		let expected_keys = [
			"title",
			"creator",
			"contributor",
			"date",
			"description",
			"publisher",
			"language",
			"subject",
			"identifier_calibre",
			"identifier_uuid",
			"identifier_isbn",
			"identifier_amazon",
			"identifier_goodreads",
			"series",
			"series_index",
			"rating",
			"timestamp",
			"title_sort",
		];

		for key in expected_keys.iter() {
			assert!(metadata.contains_key(*key), "Missing expected key: {}", key);
		}
	}

	#[test]
	fn test_parse_calibre_html_description_opf() {
		let opf_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests")
			.join("data")
			.join("calibre-html-descriptions.opf");

		let opf_content = std::fs::read_to_string(&opf_path)
			.expect("Failed to read calibre-html-descriptions.opf test file");

		let metadata = parse_opf_xml(&opf_content)
			.expect("Failed to parse calibre-html-descriptions.opf");

		assert_eq!(
			metadata.get("title"),
			Some(&vec!["Heated Rivalry".to_string()])
		);
		assert_eq!(
			metadata.get("creator"),
			Some(&vec!["Rachel Reid".to_string()])
		);

		let descriptions = metadata
			.get("description")
			.expect("Should have description");
		assert_eq!(
			descriptions.len(),
			1,
			"Description should be a single entry"
		);
		let description = &descriptions[0];

		assert!(description.contains("Pro hockey star Shane Hollander"));
		assert!(description.contains("Boston Bears captain Ilya Rozanov"));
		assert!(description.contains("<div>"));
		assert!(description.contains("<p>"));
		assert!(description.contains("<br>"));
		assert!(description.contains("</p>"));
		assert!(description.contains("</div>"));

		assert_eq!(
			metadata.get("series"),
			Some(&vec!["Game Changers".to_string()])
		);
		assert_eq!(metadata.get("series_index"), Some(&vec!["2".to_string()]));
		assert_eq!(metadata.get("language"), Some(&vec!["eng".to_string()]));
	}

	#[test]
	fn test_parse_calibre_3_opf() {
		let opf_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
			.join("integration-tests")
			.join("data")
			.join("calibre-2.opf");

		let opf_content = std::fs::read_to_string(&opf_path)
			.expect("Failed to read calibre-2.opf test file");

		let metadata =
			parse_opf_xml(&opf_content).expect("Failed to parse calibre-3.opf");

		assert_eq!(
			metadata.get("title"),
			Some(&vec!["The Long Way to a Small, Angry Planet".to_string()])
		);
		assert_eq!(
			metadata.get("creator"),
			Some(&vec!["Becky Chambers".to_string()])
		);
		assert_eq!(
			metadata.get("publisher"),
			Some(&vec!["Harper Voyager".to_string()])
		);
		assert_eq!(metadata.get("language"), Some(&vec!["en".to_string()]));
		assert_eq!(
			metadata.get("date"),
			Some(&vec!["2014-07-29T04:00:00+00:00".to_string()])
		);

		let subjects = metadata.get("subject").expect("Should have subjects");
		assert_eq!(subjects.len(), 5);
		assert!(subjects.contains(&"Science fiction".to_string()));
		assert!(subjects.contains(&"Space Opera".to_string()));
		assert!(subjects.contains(&"LGBT".to_string()));
		assert!(subjects.contains(&"Fiction".to_string()));
		assert!(subjects.contains(&"Queer".to_string()));

		// Test the different format for series info
		assert_eq!(
			metadata.get("collection_name"),
			Some(&vec!["Wayfarers".to_string()])
		);
		assert_eq!(
			metadata.get("collection_type"),
			Some(&vec!["series".to_string()])
		);
		assert_eq!(
			metadata.get("collection_position"),
			Some(&vec!["1".to_string()])
		);

		// Test prefixed identifiers
		assert_eq!(
			metadata.get("identifier_isbn"),
			Some(&vec!["9780062444134".to_string()])
		);
		assert_eq!(
			metadata.get("identifier_mobi-asin"),
			Some(&vec!["B00M0DRZ56".to_string()])
		);
		assert_eq!(
			metadata.get("identifier_calibre"),
			Some(&vec!["42".to_string()])
		);

		let expected_keys = [
			"title",
			"creator",
			"date",
			"publisher",
			"language",
			"subject",
			"identifier_isbn",
			"identifier_mobi-asin",
			"identifier_calibre",
			"collection_name",
			"collection_type",
			"collection_position",
		];
		for key in expected_keys.iter() {
			assert!(metadata.contains_key(*key), "Missing expected key: {}", key);
		}
	}

	#[test]
	fn test_get_page_content_types() {
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);
		let processor = EpubProcessor;

		let cover = processor.get_page_content_types(path, vec![1]);
		assert!(cover.is_ok());
	}

	#[test]
	fn test_get_cover() {
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);

		let cover = get_cover(path);
		assert!(cover.is_ok());
	}

	#[test]
	fn test_get_chapter() {
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);

		let chapter = get_chapter(path, 1);
		assert!(chapter.is_ok());
	}

	#[test]
	fn test_get_cover_then_chapter() {
		let path_str = get_test_epub_path();
		let path = Path::new(&path_str);

		let cover = get_cover(path);
		assert!(cover.is_ok());
		let chapter = get_chapter(path, 1);
		assert!(chapter.is_ok());
	}
}
