use std::{
    fs::{DirEntry, File},
    io::Read,
};

use super::error::ProcessFileError;

pub enum MediaFileType {
    Rar,
    Zip,
    Unsupported,
}

pub struct MediaProcessor {
    file: DirEntry,
    kind: MediaFileType,
}

pub type ProccessResult = Result<(Option<String>, Vec<String>), ProcessFileError>;

impl MediaProcessor {
    pub fn new(file: DirEntry) -> Self {
        let kind = MediaProcessor::get_file_kind(&file);

        Self { file, kind }
    }

    // TODO: make more
    fn get_file_kind(file: &DirEntry) -> MediaFileType {
        let path = file.path();
        let ext = path.extension().unwrap().to_str().unwrap();

        match ext {
            "cbr" => MediaFileType::Rar,
            "cbz" => MediaFileType::Zip,
            _ => MediaFileType::Unsupported,
        }
    }

    // FIXME: error handling
    pub fn process_rar(&self) -> ProccessResult {
        info!("Processing Rar: {}", &self.file.path().display());

        let path = &self.file.path();
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
                Ok(bytes) => Ok((Some(std::str::from_utf8(&bytes)?.to_owned()), entries)),
                Err(e) => Err(ProcessFileError::RarOpenError),
            }
        } else {
            Ok((None, entries))
        }
    }

    pub fn process_zip(&self) -> ProccessResult {
        info!("Processing Zip: {}", &self.file.path().display());

        let zipfile = std::fs::File::open(&self.file.path())?;
        let mut archive = zip::ZipArchive::new(zipfile)?;

        let mut comic_info = None;
        let mut entries = Vec::new();

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            entries.push(file.name().to_owned());
            if file.name() == "ComicInfo.xml" {
                let mut contents = String::new();
                file.read_to_string(&mut contents)?;
                comic_info = Some(contents);
            }
        }

        Ok((comic_info, entries))
    }

    pub fn process_file(&self) -> ProccessResult {
        match self.kind {
            MediaFileType::Rar => self.process_rar(),
            MediaFileType::Zip => self.process_zip(),
            MediaFileType::Unsupported => Err(ProcessFileError::UnsupportedFileType),
        }
    }
}
