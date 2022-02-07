use rocket::http::ContentType;
use unrar::archive::Entry;
use walkdir::DirEntry;

use crate::fs::error::ProcessFileError;
use crate::fs::media_file::{self, GetPageResult, IsImage, ProcessResult};

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
                media_file::process_comic_info(std::str::from_utf8(&bytes)?.to_owned()),
                entries,
            )),
            Err(e) => Err(ProcessFileError::RarOpenError),
        }
    } else {
        Ok((None, entries))
    }
}

// FIXME: this is not an ideal solution and is potentially unsafe. unrar seems to open the archive
// in a different order than the actual content. I am sorting by filename, *however* this really is *not* ideal.
// If the files were to have any other naming scheme that would be a problem.
pub fn get_rar_image(file: &str, page: usize) -> GetPageResult {
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
