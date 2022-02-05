use crate::{
    database::entities::{library, media},
    fs::checksum::Crc,
    types::{
        comic::ComicInfo,
        dto::{GetMediaQuery, GetMediaQueryResult},
    },
};
use chrono::{DateTime, NaiveDateTime, Utc};
use log::info;
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
use std::{collections::HashMap, path::Path};
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
        if self.is_dir() {
            return true;
        } else if self.file_name().unwrap().to_str().unwrap().starts_with(".") {
            return true;
        }

        false
    }
}

// TODO: maybe take in Vev<series::Model> ??
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

    fn generate_model(
        &self,
        file: DirEntry,
        checksum: String,
        media: (Option<ComicInfo>, Vec<String>),
    ) -> media::ActiveModel {
        let (info, entries) = media;
        // TODO: determine series ??
        let parent = file.path().parent().unwrap();

        let metadata = match file.metadata() {
            Ok(metadata) => Some(metadata),
            _ => None,
        };

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

        let mut size: u64 = 0;
        let mut modified: Option<NaiveDateTime> = None;

        if let Some(metadata) = metadata {
            size = metadata.len();

            modified = match metadata.modified() {
                Ok(st) => {
                    let dt: DateTime<Utc> = st.clone().into();
                    Some(dt.naive_utc())
                }
                Err(_) => Some(Utc::now().naive_utc()),
            };
        }

        media::ActiveModel {
            // FIXME: series_id is hard coded. Needs to be generated somehow,
            series_id: Set(2),
            name: Set(name),
            description: Set(comic_info.summary),
            size: Set(size as i64),
            extension: Set(ext),
            pages: Set(match comic_info.page_count {
                Some(count) => count as i32,
                None => entries.len() as i32,
            }),
            updated_at: Set(modified),
            downloaded: Set(false),
            checksum: Set(checksum),
            path: Set(path),
            ..Default::default()
        }
    }

    async fn insert_media(&self, model: media::ActiveModel) {
        // TODO: handle me please
        info!(
            "Insertion Result: {:?}",
            model.insert(self.db).await.map_err(|e| e.to_string())
        );
    }

    pub async fn do_scan(&mut self, library: &library::Model) {
        for entry in WalkDir::new(&library.path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();

            if path.should_ignore() {
                continue;
            }

            let mut crc = Crc::new(path.to_str().unwrap());

            let checksum = crc.checksum();

            if self.media.contains_key(&checksum) {
                continue;
            }

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
                    let model = self.generate_model(entry, checksum, info);
                    // self.insert_new_media(entry, checksum, info).await;
                    self.insert_media(model).await;
                }
                Err(e) => {
                    // error!("Error processing file: {}", e);
                }
            }
        }
    }

    pub async fn scan(&mut self) -> usize {
        // FIXME: don't want to clone
        for library in self.libraries.clone().iter() {
            self.do_scan(library).await;
        }

        0
    }
}
