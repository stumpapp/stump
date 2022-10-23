use std::{
	fs::File,
	path::{Path, PathBuf},
};

#[cfg(target_family = "unix")]
use std::os::unix::prelude::MetadataExt;

#[cfg(target_family = "windows")]
use std::os::windows::prelude::*;

use crate::{
	fs::{
		checksum,
		media_file::{get_content_type_from_mime, guess_content_type},
	},
	prelude::{errors::ProcessFileError, fs::ProcessedMediaFile, ContentType},
};
use epub::doc::EpubDoc;
use tracing::{debug, error, warn};

/*
epubcfi usually starts with /6, referring to spine element of package file
file has three groups of elements: metadata, manifest and spine.
*/
// TODO: options: &LibraryOptions
pub fn digest_epub(path: &Path, size: u64) -> Option<String> {
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

fn load_epub(path: &str) -> Result<EpubDoc<File>, ProcessFileError> {
	EpubDoc::new(path).map_err(|e| ProcessFileError::EpubOpenError(e.to_string()))
}

pub fn process_epub(path: &Path) -> Result<ProcessedMediaFile, ProcessFileError> {
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
		checksum: digest_epub(path, file_size),
		metadata: None,
		pages,
	})
}

// TODO: change return type to make more sense
pub fn get_epub_cover(file: &str) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mut epub_file = EpubDoc::new(file).map_err(|e| {
		error!("Failed to open epub file: {}", e);
		ProcessFileError::EpubOpenError(e.to_string())
	})?;

	let cover = epub_file.get_cover().map_err(|e| {
		error!("Failed to get cover from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	// FIXME: mime type
	Ok((get_content_type_from_mime("image/png"), cover))
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
		Ok(mime) => get_content_type_from_mime(&mime),
		Err(e) => {
			warn!(
				"Failed to get explicit definition of resource mime for {}: {}",
				path, e
			);

			// FIXME: when did I write this? lmao
			guess_content_type("REMOVEME.xhml")
		},
	};

	Ok((content_type, content))
}

pub fn get_epub_resource(
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

	Ok((get_content_type_from_mime(&content_type), contents))
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
		Ok(mime) => get_content_type_from_mime(&mime),
		Err(e) => {
			warn!(
				"Failed to get explicit definition of resource mime for {}: {}",
				adjusted_path.as_path().to_str().unwrap(),
				e
			);

			guess_content_type(adjusted_path.as_path().to_str().unwrap())
		},
	};

	Ok((content_type, contents))
}
