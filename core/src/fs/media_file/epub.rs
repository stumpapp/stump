use std::{
	collections::HashMap,
	fs::File,
	io::BufReader,
	path::{Path, PathBuf},
};

#[cfg(target_family = "unix")]
use std::os::unix::prelude::MetadataExt;

#[cfg(target_family = "windows")]
use std::os::windows::prelude::*;

const ACCEPTED_EPUB_COVER_MIMES: [&str; 2] = ["image/jpeg", "image/png"];
const DEFAULT_EPUB_COVER_ID: &str = "cover";

use crate::{
	fs::checksum,
	prelude::{errors::ProcessFileError, fs::ProcessedMediaFile, ContentType},
};
use epub::doc::EpubDoc;
use tracing::{debug, error, trace, warn};

/*
epubcfi usually starts with /6, referring to spine element of package file
file has three groups of elements: metadata, manifest and spine.
*/
// TODO: options: &LibraryOptions
pub fn digest(path: &Path, size: u64) -> Option<String> {
	let mut bytes_to_read = size;

	// FIXME: this isn't ideal
	if size > 40000 {
		bytes_to_read = 40000;
	}

	match checksum::digest(path.to_str().unwrap(), bytes_to_read) {
		Ok(digest) => Some(digest),
		Err(e) => {
			error!(
				"Failed to digest epub {:?}, unable to create checksum: {}",
				path, e
			);
			None
		},
	}
}

fn load_epub(path: &str) -> Result<EpubDoc<BufReader<File>>, ProcessFileError> {
	EpubDoc::new(path).map_err(|e| ProcessFileError::EpubOpenError(e.to_string()))
}

pub fn process(path: &Path) -> Result<ProcessedMediaFile, ProcessFileError> {
	debug!("Processing Epub: {}", path.display());

	let epub_file = load_epub(path.to_str().unwrap())?;

	let pages = epub_file.get_num_pages() as i32;

	let file_metadata = path.metadata().map_err(|e| {
		error!("Failed to get metadata for epub file: {}", e.to_string());
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	#[cfg(target_family = "unix")]
	let file_size = file_metadata.size();
	#[cfg(target_family = "windows")]
	let file_size = file_metadata.file_size();

	Ok(ProcessedMediaFile {
		thumbnail_path: None,
		path: path.to_path_buf(),
		checksum: digest(path, file_size),
		metadata: None,
		pages,
	})
}

// TODO: change return type to make more sense
/// Returns the cover image for the epub file. If a cover image cannot be extracted via the
/// metadata, it will go through two rounds of fallback methods:
///
/// 1. Attempt to find a resource with the default ID of "cover"
/// 2. Attempt to find a resource with a mime type of "image/jpeg" or "image/png", and weight the
/// results based on how likely they are to be the cover. For example, if the cover is named
/// "cover.jpg", it's probably the cover. The entry with the heighest weight, if any, will be
/// returned.
pub fn get_cover(file: &str) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mut epub_file = EpubDoc::new(file).map_err(|e| {
		error!("Failed to open epub file: {}", e);
		ProcessFileError::EpubOpenError(e.to_string())
	})?;

	let cover_id = epub_file.get_cover_id().unwrap_or_else(|_| {
		debug!("Epub file does not contain cover metadata");
		DEFAULT_EPUB_COVER_ID.to_string()
	});

	if let Ok(cover) = epub_file.get_resource(&cover_id) {
		let mime = epub_file
			.get_resource_mime(&cover_id)
			.unwrap_or_else(|_| "image/png".to_string());

		return Ok((ContentType::from(mime.as_str()), cover));
	}

	debug!(
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
			trace!(name = ?path, "Found possible cover image");
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
		if let Ok(c) = epub_file.get_resource(id) {
			let mime = epub_file
				.get_resource_mime(id)
				.unwrap_or_else(|_| "image/png".to_string());

			return Ok((ContentType::from(mime.as_str()), c));
		}
	}

	error!("Failed to find cover for epub file");
	Err(ProcessFileError::EpubReadError(
		"Failed to find cover for epub file".to_string(),
	))
}

pub fn get_epub_chapter(
	path: &str,
	chapter: usize,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mut epub_file = load_epub(path)?;

	epub_file.set_current_page(chapter).map_err(|e| {
		error!("Failed to get chapter from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	let content = epub_file.get_current_with_epub_uris().map_err(|e| {
		error!("Failed to get chapter from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	let content_type = match epub_file.get_current_mime() {
		Ok(mime) => ContentType::from(mime.as_str()),
		Err(e) => {
			error!(
				error = ?e,
				chapter_path = ?path,
				"Failed to get explicit resource mime for chapter. Returning default.",
			);

			ContentType::XHTML
		},
	};

	Ok((content_type, content))
}

pub fn get_epub_resource_by_id(
	path: &str,
	resource_id: &str,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mut epub_file = load_epub(path)?;

	let contents = epub_file.get_resource(resource_id).map_err(|e| {
		error!("Failed to get resource: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	let content_type = epub_file.get_resource_mime(resource_id).map_err(|e| {
		error!("Failed to get resource mime: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	Ok((ContentType::from(content_type.as_str()), contents))
}

pub fn normalize_resource_path(path: PathBuf, root: &str) -> PathBuf {
	let mut adjusted_path = path;

	if !adjusted_path.starts_with(root) {
		adjusted_path = PathBuf::from(root).join(adjusted_path);
	}

	//  This below won't work since these paths are INSIDE the epub file >:(
	// adjusted_path = adjusted_path.canonicalize().unwrap_or_else(|err| {
	// 	// warn!(
	// 	// 	"Failed to safely canonicalize path {}: {}",
	// 	// 	adjusted_path.display(),
	// 	// 	err
	// 	// );

	// 	warn!(
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

pub fn get_epub_resource_from_path(
	path: &str,
	root: &str,
	resource_path: PathBuf,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mut epub_file = load_epub(path)?;

	let adjusted_path = normalize_resource_path(resource_path, root);

	let contents = epub_file
		.get_resource_by_path(adjusted_path.as_path())
		.map_err(|e| {
			error!("Failed to get resource: {}", e);
			ProcessFileError::EpubReadError(e.to_string())
		})?;

	// Note: If the resource does not have an entry in the `resources` map, then loading the content
	// type will fail. This seems to only happen when loading the root file (e.g. container.xml,
	// package.opf, etc.).
	let content_type = match epub_file.get_resource_mime_by_path(adjusted_path.as_path())
	{
		Ok(mime) => ContentType::from(mime.as_str()),
		Err(e) => {
			warn!(
				"Failed to get explicit definition of resource mime for {}: {}",
				adjusted_path.as_path().to_str().unwrap(),
				e
			);

			ContentType::from_path(adjusted_path.as_path())
		},
	};

	Ok((content_type, contents))
}

pub fn get_content_types_for_chapters(
	file_path: &str,
	chapters: Vec<i32>,
) -> Result<HashMap<i32, ContentType>, ProcessFileError> {
	let mut epub_file = load_epub(file_path)?;

	let mut content_types = HashMap::new();

	for chapter in chapters {
		if chapter == 1 {
			// Assume this is the cover page
			// FIXME: This is wrong. I just don't want to deal with it right now...
			content_types.insert(chapter, ContentType::JPEG);
			continue;
		}

		epub_file.set_current_page(chapter as usize).map_err(|e| {
			error!("Failed to get chapter from epub file: {}", e);
			ProcessFileError::EpubReadError(e.to_string())
		})?;

		let content_type = match epub_file.get_current_mime() {
			Ok(mime) => ContentType::from(mime.as_str()),
			Err(e) => {
				error!(
					error = ?e,
					chapter_path = ?file_path,
					"Failed to get explicit resource mime for chapter. Returning default.",
				);

				ContentType::XHTML
			},
		};

		content_types.insert(chapter, content_type);
	}

	Ok(content_types)
}
