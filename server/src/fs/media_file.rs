use std::io::Read;

use walkdir::DirEntry;

use crate::types::comic::ComicInfo;

use super::error::ProcessFileError;

pub type ProccessResult = Result<(Option<ComicInfo>, Vec<String>), ProcessFileError>;

pub fn process_comic_info(buffer: String) -> Option<ComicInfo> {
    match serde_xml_rs::from_str(&buffer) {
        Ok(info) => Some(info),
        _ => None,
    }
}

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
