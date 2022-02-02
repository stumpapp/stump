use rocket::http::ContentType;
use std::io::Read;
use unrar::archive::Entry;

use walkdir::DirEntry;
use zip::read::ZipFile;

use crate::types::comic::ComicInfo;
use crate::types::rocket::ImageResponse;

use super::error::ProcessFileError;

pub type ProcessResult = Result<(Option<ComicInfo>, Vec<String>), ProcessFileError>;
pub type ImageResult = Result<ImageResponse, ProcessFileError>;
// pub type ImageResultCached = Result<ImageResponseCached, ProcessFileError>;

// FIXME: error handling is a mess

trait IsImage {
    fn is_image(&self) -> bool;
}

impl<'a> IsImage for ZipFile<'a> {
    fn is_image(&self) -> bool {
        if self.is_file() {
            let file_name = self.name();
            let file_name = file_name.to_lowercase();
            return file_name.ends_with(".jpg")
                || file_name.ends_with(".jpeg")
                || file_name.ends_with(".png");
        }

        false
    }
}

impl IsImage for Entry {
    fn is_image(&self) -> bool {
        if self.is_file() {
            let file_name = self.filename.to_lowercase();
            return file_name.ends_with(".jpg")
                || file_name.ends_with(".jpeg")
                || file_name.ends_with(".png");
        }

        false
    }
}

pub fn process_comic_info(buffer: String) -> Option<ComicInfo> {
    match serde_xml_rs::from_str(&buffer) {
        Ok(info) => Some(info),
        _ => None,
    }
}

/// Processes a zip file in its entirety. Will return a tuple of the comic info and the list of
/// files in the zip.
pub fn process_zip(file: &DirEntry) -> ProcessResult {
    info!("Processing Zip: {}", file.path().display());

    let zip_file = std::fs::File::open(file.path())?;
    let mut archive = zip::ZipArchive::new(zip_file)?;

    let mut comic_info = None;
    let mut entries = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        entries.push(file.name().to_owned());
        if file.name() == "ComicInfo.xml" {
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;
            comic_info = process_comic_info(contents);
        }
    }

    Ok((comic_info, entries))
}

/// Processes a rar file in its entirety. Will return a tuple of the comic info and the list of
/// files in the rar.
pub fn process_rar(file: &DirEntry) -> ProcessResult {
    info!("Processing Rar: {}", file.path().display());

    let path = file.path();
    let archive = unrar::Archive::new(path.to_string_lossy().to_string());

    let mut entries: Vec<String> = Vec::new();

    match archive.list() {
        Ok(open_archive) => {
            for entry in open_archive {
                match entry {
                    Ok(e) => {
                        entries.push(e.filename);
                    }
                    Err(e) => return Err(ProcessFileError::RarOpenError),
                }
            }
        }
        Err(e) => return Err(ProcessFileError::RarOpenError),
    };

    if entries.iter().any(|e| e == "ComicInfo.xml") {
        let archive = unrar::Archive::new(path.to_string_lossy().into());

        match archive.read_bytes("ComicInfo.xml") {
            Ok(bytes) => Ok((
                process_comic_info(std::str::from_utf8(&bytes)?.to_owned()),
                entries,
            )),
            Err(e) => Err(ProcessFileError::RarOpenError),
        }
    } else {
        Ok((None, entries))
    }
}

fn get_content_type(file: &ZipFile) -> ContentType {
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

// FIXME: this is not an ideal solution and is potentially unsafe. unrar seems to open the archive
// in a different order than the actual content. I am sorting by filename, *however* this really is *not* ideal.
// If the files were to have any other naming scheme that would be a problem.
pub fn get_rar_image(file: &str, page: usize) -> ImageResult {
    let archive = unrar::Archive::new(file.to_string());

    let mut filename: Option<String> = None;

    match archive.list() {
        Ok(open_archive) => {
            let mut images_seen = 0;

            let mut entries: Vec<_> = open_archive.into_iter().filter_map(|e| e.ok()).collect();
            entries.sort_by(|a, b| a.filename.cmp(&b.filename));

            for e in entries {
                if images_seen + 1 == page && e.is_image() {
                    filename = Some(e.filename);
                    break;
                } else if e.is_image() {
                    images_seen += 1;
                }
            }
        }
        Err(e) => return Err(ProcessFileError::RarOpenError),
    };

    if filename.is_some() {
        let archive = unrar::Archive::new(file.to_string());

        match archive.read_bytes(&filename.unwrap()) {
            Ok(bytes) => Ok((ContentType::JPEG, bytes)),
            Err(e) => Err(ProcessFileError::RarOpenError),
        }
    } else {
        Err(ProcessFileError::RarOpenError)
    }
}

pub fn get_zip_image(file: &str, page: usize) -> ImageResult {
    let zip_file = std::fs::File::open(file)?;
    let mut archive = zip::ZipArchive::new(zip_file)?;

    if archive.len() == 0 {
        return Err(ProcessFileError::ArchiveEmptyError);
    }

    let mut images_seen = 0;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;

        let mut contents = Vec::new();
        let content_type = get_content_type(&file);

        if images_seen + 1 == page && file.is_image() {
            file.read_to_end(&mut contents)?;
            return Ok((content_type, contents));
        } else if file.is_image() {
            images_seen += 1;
        }
    }

    Err(ProcessFileError::NoImageError)
}

pub fn get_image(file: &str, page: usize) -> ImageResult {
    let file_name = file.to_string();

    match file_name.rfind('.') {
        Some(index) => {
            let extension = &file_name[index..];

            if extension == ".cbr" {
                return get_rar_image(file, page);
            } else if extension == ".cbz" {
                return get_zip_image(file, page);
            }

            return Err(ProcessFileError::UnsupportedFileType);
        }
        None => Err(ProcessFileError::UnsupportedFileType),
    }
}
