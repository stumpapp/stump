use rocket::http::ContentType;
use std::str::FromStr;
use walkdir::DirEntry;
use zip::read::ZipFile;

use crate::types::{
	alias::ProcessResult, errors::ProcessFileError, http::ImageResponse,
	models::MediaMetadata,
};

use super::{
	epub::get_epub_page,
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

pub fn get_content_type(file: &ZipFile) -> ContentType {
	let file_name = file.name();
	let file_name = file_name.to_lowercase();

	if file_name.ends_with(".jpg") || file_name.ends_with(".jpeg") {
		return ContentType::JPEG;
	} else if file_name.ends_with(".png") {
		return ContentType::PNG;
	}

	// FIXME: don't love this
	ContentType::Any
}

// TODO: use https://crates.io/crates/infer
pub fn get_content_type_from_mime(mime: &str) -> ContentType {
	ContentType::from_str(mime).unwrap_or(match mime {
		"image/jpeg" => ContentType::JPEG,
		"image/png" => ContentType::PNG,
		"application/xhtml+xml" => ContentType::XML,
		_ => ContentType::Any,
	})
}

pub fn get_page(file: &str, page: i32, try_webp: bool) -> GetPageResult {
	let file_name = file.to_string();

	if file_name.ends_with(".cbr") {
		get_rar_image(file, page, try_webp)
	} else if file_name.ends_with(".cbz") {
		get_zip_image(file, page)
	} else if file_name.ends_with(".epub") {
		get_epub_page(file, page)
	} else {
		Err(ProcessFileError::UnsupportedFileType)
	}
}

pub fn process_entry(entry: &DirEntry) -> ProcessResult {
	match entry.file_name().to_str() {
		Some(name) if name.ends_with("cbr") => process_rar(entry),
		Some(name) if name.ends_with("cbz") => process_zip(entry),
		// Some(name) if name.ends_with("epub") => process_epub(entry),
		_ => Err(ProcessFileError::UnsupportedFileType),
	}
}
