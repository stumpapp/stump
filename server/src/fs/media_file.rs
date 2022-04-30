use rocket::http::ContentType;
use std::str::FromStr;
use zip::read::ZipFile;

use crate::types::{errors::ProcessFileError, http::ImageResponse, models::ComicInfo};

use super::{epub::get_epub_page, rar::get_rar_image, zip::get_zip_image};

// FIXME: this needs to change. I really only need the ComicInfo
pub type ProcessResult = Result<(Option<ComicInfo>, Vec<String>), ProcessFileError>;
pub type GetPageResult = Result<ImageResponse, ProcessFileError>;

pub trait IsImage {
    fn is_image(&self) -> bool;
}

pub fn process_comic_info(buffer: String) -> Option<ComicInfo> {
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

pub fn get_page(file: &str, page: i32) -> GetPageResult {
    let file_name = file.to_string();

    if file_name.ends_with(".cbr") {
        get_rar_image(file, page)
    } else if file_name.ends_with(".cbz") {
        get_zip_image(file, page)
    } else if file_name.ends_with(".epub") {
        get_epub_page(file, page)
    } else {
        Err(ProcessFileError::UnsupportedFileType)
    }
}
