use rocket::http::ContentType;
use std::{path::Path, str::FromStr};
use walkdir::DirEntry;
use zip::read::ZipFile;

use crate::types::{
	alias::ProcessResult, errors::ProcessFileError, http::ImageResponse,
	models::MediaMetadata,
};

use super::{
	// epub::get_epub_page,
	rar::{get_rar_image, process_rar},
	zip::{get_zip_image, process_zip},
};

// FIXME: this needs to change. I really only need the MediaMetadata
// pub type ProcessResult = Result<(Option<MediaMetadata>, Vec<String>), ProcessFileError>;
pub type GetPageResult = Result<ImageResponse, ProcessFileError>;

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

pub fn guess_content_type(file: &str) -> ContentType {
	let file_name = file.to_lowercase();

	if file_name.ends_with(".jpg") || file_name.ends_with(".jpeg") {
		return ContentType::JPEG;
	} else if file_name.ends_with(".png") {
		return ContentType::PNG;
	}

	// FIXME: don't love this
	ContentType::Any
}

pub fn get_content_type(file: &ZipFile) -> ContentType {
	let file_name = file.name();

	let mime = infer_mime(Path::new(file_name));

	match mime {
		Some(m) => match ContentType::from_str(m) {
			Ok(t) => {
				log::debug!("Inferred content type: {:?}", t);
				t
			},
			_ => {
				log::debug!(
					"Failed to infer content type from {:?} for file {:?}",
					m,
					file_name
				);
				ContentType::Any
			},
		},
		None => {
			log::debug!("Failed to infer content type for file {:?}", file_name);
			ContentType::Any
		},
	}
}

pub fn get_content_type_from_mime(mime: &str) -> ContentType {
	ContentType::from_str(mime).unwrap_or(match mime {
		"image/jpeg" => ContentType::JPEG,
		"image/png" => ContentType::PNG,
		"application/xhtml+xml" => ContentType::XML,
		_ => ContentType::Any,
	})
}

pub fn guess_mime(path: &Path) -> Option<&str> {
	let extension = path.extension().and_then(|ext| ext.to_str());

	if extension.is_none() {
		log::warn!("Unable to guess mime for file: {:?}", path);
		return None;
	}

	let extension = extension.unwrap();

	match extension.to_lowercase().as_str() {
		"pdf" => Some("application/pdf"),
		"epub" => Some("application/epub+zip"),
		"cbz" => Some("application/zip"),
		"zip" => Some("application/zip"),
		"cbr" => Some("application/vnd.rar"),
		_ => None,
	}
}

pub fn infer_mime(path: &Path) -> Option<&str> {
	match infer::get_from_path(path) {
		Ok(mime) => {
			log::debug!("Inferred mime for file {:?}: {:?}", path, mime);
			mime.and_then(|m| Some(m.mime_type()))
		},
		Err(e) => {
			log::warn!(
				"Unable to infer mime for file {:?}: {:?}",
				path,
				e.to_string()
			);

			guess_mime(path)
		},
	}
}

pub fn get_page(file: &str, page: i32, try_webp: bool) -> GetPageResult {
	let mime = infer_mime(Path::new(file));

	match mime {
		Some("application/zip") => get_zip_image(file, page),
		Some("application/vnd.rar") => get_rar_image(file, page, try_webp),
		None => Err(ProcessFileError::Unknown(format!(
			"Unable to determine mime type for file: {:?}",
			file
		))),
		_ => Err(ProcessFileError::UnsupportedFileType(file.to_string())),
	}
}

pub fn process_entry(entry: &DirEntry) -> ProcessResult {
	let mime = infer_mime(entry.path());

	match mime {
		Some("application/zip") => process_zip(entry),
		Some("application/vnd.rar") => process_rar(entry),
		None => Err(ProcessFileError::Unknown(format!(
			"Unable to determine mime type for file: {:?}",
			entry.path()
		))),
		_ => Err(ProcessFileError::UnsupportedFileType(
			entry.path().to_string_lossy().into_owned(),
		)),
	}
}
