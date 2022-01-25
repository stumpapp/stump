use crate::{
    database::entities::{library, media},
    fs::checksum::Crc,
    types::{
        comic::ComicInfo,
        dto::{GetMediaQuery, GetMediaQueryResult},
    },
};
use log::info;
use rocket::futures::executor::block_on;
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};
use walkdir::{DirEntry, WalkDir};

use super::media_file::{process_rar, process_zip};

pub struct Scanner<'a> {
    pub db: &'a DatabaseConnection,
    pub libraries: Vec<library::Model>,
    pub media: HashMap<String, GetMediaQuery>,
}

pub trait IgnoredFile {
    fn should_ignore(&self) -> bool;
}

impl IgnoredFile for Path {
    fn should_ignore(&self) -> bool {
        let path = self.to_str().unwrap();

        if self.file_name().unwrap().to_str().unwrap().starts_with(".") {
            return true;
        }

        if path.ends_with(".DS_Store") {
            return true;
        }

        false
    }
}

impl<'a> Scanner<'a> {
    pub fn new(
        db: &'a DatabaseConnection,
        libraries: Vec<library::Model>,
        media: GetMediaQueryResult,
    ) -> Self {
        let mut hashmap = HashMap::new();

        for media in media {
            hashmap.insert(media.checksum.clone(), media);
        }

        Self {
            db,
            libraries,
            media: hashmap,
        }
    }

    // TODO: this shouldn't really live in here probably.
    async fn insert_new_media(
        &self,
        file: DirEntry,
        checksum: String,
        media: (Option<ComicInfo>, Vec<String>),
    ) {
        let (info, entries) = media;
        // TODO: determine series
        let parent = file.path().parent().unwrap();

        let path = file.path().to_str().unwrap().to_string();
        let name = file.file_name().to_str().unwrap().to_string();
        let ext = file
            .path()
            .extension()
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();

        let comic_info = match info {
            Some(info) => info,
            None => ComicInfo::default(),
        };

        let model = media::ActiveModel {
            series_id: Set(2),
            name: Set(name),
            description: Set(comic_info.summary),
            size: Set(0),
            extension: Set(ext),
            pages: Set(match comic_info.page_count {
                Some(count) => count as i32,
                None => entries.len() as i32,
            }),
            updated_at: Set(None),
            downloaded: Set(false),
            checksum: Set(checksum),
            path: Set(path),
            ..Default::default()
        };

        info!("Inserting new media: {:?}", model);

        info!(
            "{:?}",
            model.insert(self.db).await.map_err(|e| e.to_string())
        );
    }

    // FIXME: this is SUPER messy and inefficient. It isn't even 100% functional yet.
    // Very very rough draft, the whole struct honestly - I don't even love committing this lol.
    // I need to figure out how to do this MUCH MUCH better.
    fn scan_library(&self, library_path: PathBuf, library: &library::Model) {
        for entry in WalkDir::new(&library_path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();

            // check if path is equivalent to library path (ignore to avoid stack overflow)
            if path.to_path_buf().eq(&library_path) {
                continue;
            }

            if path.is_dir() {
                info!("Scanning subfolder in library: {}", path.display());
                self.scan_library(path.to_path_buf(), library);
            } else if !path.should_ignore() {
                let mut crc = Crc::new(path.to_str().unwrap());
                // FIXME: terribly slow!
                let checksum = crc.checksum();

                if !self.media.contains_key(&checksum) {
                    info!("New file found: {}", path.to_str().unwrap());
                    info!("File metadata: {:?}", entry.metadata().unwrap());

                    let processed_info = match entry.file_name().to_str() {
                        Some(name) if name.ends_with("cbr") => process_rar(&entry),
                        Some(name) if name.ends_with("cbz") => process_zip(&entry),
                        _ => {
                            info!("Unsupported file: {}", entry.path().display());
                            continue;
                        }
                    };

                    match processed_info {
                        Ok(info) => {
                            block_on(self.insert_new_media(entry, checksum, info));
                        }
                        Err(e) => {
                            error!("Error processing file: {}", e);
                        }
                    }
                } else {
                    println!("Already present in database: {}", path.to_str().unwrap());
                }
            }
        }
    }

    pub fn scan(&self) -> usize {
        for library in self.libraries.iter() {
            let path = PathBuf::from(&library.path);
            info!("Scanning library: {}", path.display());
            self.scan_library(path, library);
        }

        0
    }
}
