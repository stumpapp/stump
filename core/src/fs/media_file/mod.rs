pub mod constants;
pub mod epub;
pub mod pdf;
pub mod rar;
pub mod zip;

use std::path::Path;
use tracing::debug;

use crate::{
	db::models::LibraryOptions,
	prelude::{
		errors::ProcessFileError,
		fs::media_file::{MediaMetadata, ProcessedMediaFile},
		ContentType,
	},
};

// TODO: move trait, maybe merge with another.
pub trait IsImage {
	fn is_image(&self) -> bool;
}

pub fn process_comic_info(buffer: String) -> Option<MediaMetadata> {
	if buffer.is_empty() {
		return None;
	}

	match serde_xml_rs::from_str(&buffer) {
		Ok(info) => Some(info),
		_ => None,
	}
}

pub fn get_page(
	file: &str,
	page: i32,
) -> Result<(ContentType, Vec<u8>), ProcessFileError> {
	let mime = ContentType::from_file(file).mime_type();

	match mime.as_str() {
		"application/zip" => zip::get_image(file, page),
		"application/vnd.comicbook+zip" => zip::get_image(file, page),
		"application/vnd.rar" => rar::get_image(file, page),
		"application/vnd.comicbook-rar" => rar::get_image(file, page),
		"application/epub+zip" => {
			if page == 1 {
				epub::get_cover(file)
			} else {
				Err(ProcessFileError::UnsupportedFileType(
					"You may only request the cover page (first page) for epub files on this endpoint".into()
				))
			}
		},
		"unknown" => Err(ProcessFileError::Unknown(format!(
			"Unable to determine mime type for file: {:?}",
			file
		))),
		_ => Err(ProcessFileError::UnsupportedFileType(file.to_string())),
	}
}

fn process_rar(
	convert: bool,
	path: &Path,
) -> Result<ProcessedMediaFile, ProcessFileError> {
	if convert {
		let zip_path = rar::convert_to_zip(path)?;
		zip::process(zip_path.as_path())
	} else {
		rar::process(path)
	}
}

pub fn process(
	path: &Path,
	options: &LibraryOptions,
) -> Result<ProcessedMediaFile, ProcessFileError> {
	debug!(?path, ?options, "Processing entry");
	let mime = ContentType::from_path(path).mime_type();

	match mime.as_str() {
		"application/zip" => zip::process(path),
		"application/vnd.comicbook+zip" => zip::process(path),
		"application/vnd.rar" => process_rar(options.convert_rar_to_zip, path),
		"application/vnd.comicbook-rar" => process_rar(options.convert_rar_to_zip, path),
		"application/epub+zip" => epub::process(path),
		"unknown" => Err(ProcessFileError::Unknown(format!(
			"Unable to determine mime type for file: {:?}",
			path
		))),
		_ => Err(ProcessFileError::UnsupportedFileType(
			path.to_string_lossy().into_owned(),
		)),
	}
}
