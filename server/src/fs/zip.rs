use crate::fs::media_file::{self, GetPageResult, IsImage, ProcessResult};

use crate::fs::error::ProcessFileError;
use std::io::Read;
use walkdir::DirEntry;
use zip::read::ZipFile;

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
            comic_info = media_file::process_comic_info(contents);
        }
    }

    Ok((comic_info, entries))
}

/// Get an image from a zip file by index (page).
pub fn get_zip_image(file: &str, page: usize) -> GetPageResult {
    let zip_file = std::fs::File::open(file)?;
    let mut archive = zip::ZipArchive::new(zip_file)?;

    if archive.len() == 0 {
        return Err(ProcessFileError::ArchiveEmptyError);
    }

    let mut images_seen = 0;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;

        let mut contents = Vec::new();
        let content_type = media_file::get_content_type(&file);

        if images_seen + 1 == page && file.is_image() {
            file.read_to_end(&mut contents)?;
            return Ok((content_type, contents));
        } else if file.is_image() {
            images_seen += 1;
        }
    }

    Err(ProcessFileError::NoImageError)
}
