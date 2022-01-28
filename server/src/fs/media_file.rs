use std::io::Read;
use rocket::fs::NamedFile;

use walkdir::DirEntry;
use zip::read::ZipFile;

use crate::types::comic::ComicInfo;

use super::error::ProcessFileError;

pub type ProccessResult = Result<(Option<ComicInfo>, Vec<String>), ProcessFileError>;
pub type ThumbnailResult = Result<Vec<u8>, ProcessFileError>;
pub type ThumbnailResultTEst = Result<NamedFile, ProcessFileError>;

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

pub fn process_comic_info(buffer: String) -> Option<ComicInfo> {
    match serde_xml_rs::from_str(&buffer) {
        Ok(info) => Some(info),
        _ => None,
    }
}

/// Processes a zip file in its entirety. Will return a tuple of the comic info and the list of
/// files in the zip.
pub fn process_zip(file: &DirEntry) -> ProccessResult {
    info!("Processing Zip: {}", file.path().display());

    let zipfile = std::fs::File::open(file.path())?;
    let mut archive = zip::ZipArchive::new(zipfile)?;

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
pub fn process_rar(file: &DirEntry) -> ProccessResult {
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

pub fn get_zip_thumbnail(file: &str) -> ThumbnailResult {
    info!("Grabbing Thumbnail for Zip: {}", file);

    let zipfile = std::fs::File::open(file)?;
    let mut archive = zip::ZipArchive::new(zipfile)?;

    if archive.len() == 0 {
        return Err(ProcessFileError::ArchiveEmptyError);
    }

    let mut contents = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;

        if file.is_image() {
            file.read_to_end(&mut contents)?;
            break;
        }
    }

    // FIXME: is this what I want to do when I can't find an image? I probably want to return a generic thumbnail based on
    // the file type? Or should the frontend handle this? I don't know, I have to see what OPDS does in this case and fix.
    Ok(contents)
    // Err(ProcessFileError::NoImageError)
}

pub fn get_zip_thumbnail_file(file: &str) -> ThumbnailResult {
    info!("Grabbing Thumbnail for Zip: {}", file);

    let zipfile = std::fs::File::open(file)?;
    let mut archive = zip::ZipArchive::new(zipfile)?;

    if archive.len() == 0 {
        return Err(ProcessFileError::ArchiveEmptyError);
    }

    let mut contents = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;

        if file.is_image() {
            file.read_to_end(&mut contents)?;
            break;
        }
    }

    // FIXME: is this what I want to do when I can't find an image? I probably want to return a generic thumbnail based on
    // the file type? Or should the frontend handle this? I don't know, I have to see what OPDS does in this case and fix.
    Ok(contents)
    // Err(ProcessFileError::NoImageError)
}
