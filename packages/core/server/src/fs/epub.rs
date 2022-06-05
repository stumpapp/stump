use std::{os::unix::prelude::MetadataExt, path::Path};

use crate::{
	fs::media_file::{self, GetPageResult},
	types::{
		alias::ProcessResult,
		errors::ProcessFileError,
		models::{MediaMetadata, ProcessedMediaFile},
	},
};
use epub::doc::EpubDoc;
use walkdir::DirEntry;

use super::checksum;

pub fn digest_epub(path: &Path, size: u64) -> Option<String> {
	let mut bytes_to_read = size;

	// FIXME: this isn't ideal
	if size > 40000 {
		bytes_to_read = 40000;
	}

	match checksum::digest(path.to_str().unwrap(), bytes_to_read) {
		Ok(digest) => Some(digest),
		Err(e) => {
			log::error!(
				"Failed to digest epub {:?}, unable to create checksum: {}",
				path,
				e
			);
			None
		},
	}
}

pub fn process_epub(file: &DirEntry) -> ProcessResult {
	log::info!("Processing Epub: {}", file.path().display());

	let path = file.path();

	let epub_file = EpubDoc::new(path).map_err(|e| {
		log::error!("Failed to open epub file: {}", e);
		ProcessFileError::EpubOpenError(e.to_string())
	})?;

	let pages = epub_file.get_num_pages() as i32;

	let metadata: Option<MediaMetadata> = None;

	Ok(ProcessedMediaFile {
		checksum: digest_epub(
			path,
			file.metadata()
				.map_err(|e| {
					log::error!(
						"Failed to get metadata for epub file: {}",
						e.to_string()
					);
					ProcessFileError::EpubReadError(e.to_string())
				})?
				.size(),
		),
		metadata,
		pages,
	})
}

pub fn get_epub_cover(file: &str) -> GetPageResult {
	let mut epub_file = EpubDoc::new(file).map_err(|e| {
		log::error!("Failed to open epub file: {}", e);
		ProcessFileError::EpubOpenError(e.to_string())
	})?;

	// println!("{:?}", epub_file.resources);

	let cover = epub_file.get_cover().map_err(|e| {
		log::error!("Failed to get cover from epub file: {}", e);
		ProcessFileError::EpubReadError(e.to_string())
	})?;

	// FIXME: mime type
	Ok((media_file::get_content_type_from_mime("image/png"), cover))
}

// FIXME: error handling here is nasty
pub fn get_epub_page(file: &str, page: i32) -> GetPageResult {
	if page == 1 {
		return get_epub_cover(file);
	}

	let res = EpubDoc::new(file);

	match res {
		Ok(mut doc) => {
			let _ = doc
				.set_current_page(page as usize)
				.map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

			let mime_type = doc
				.get_current_mime()
				.map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

			let contents = doc
				.get_current()
				.map_err(|e| ProcessFileError::EpubReadError(e.to_string()))?;

			let content_type = media_file::get_content_type_from_mime(&mime_type);

			Ok((content_type, contents))
		},
		Err(e) => Err(ProcessFileError::EpubReadError(e.to_string())),
	}
}

pub fn get_container_xml(file: &str, resource: &str) -> Option<String> {
	let res = EpubDoc::new(file);

	match res {
		Ok(doc) => {
			println!("{:?}", doc.resources);
			doc.resources.get(resource).map(|(_path, s)| s.to_owned())
		},
		Err(_) => unimplemented!(),
	}
}
