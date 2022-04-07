use crate::database::queries;
use crate::event::log::Log;
use crate::types::dto::series::SeriesWithBookCount;
use crate::{
    fs::checksum::Crc,
    types::{
        comic::ComicInfo,
        dto::{GetMediaQuery, GetMediaQueryResult},
    },
};
use chrono::{DateTime, NaiveDateTime, Utc};
use entity::sea_orm;
use entity::{library, media, series};
use log::info;
use rocket::tokio::sync::broadcast::Sender;
use sea_orm::{ActiveModelTrait, DatabaseConnection, Set};
use std::path::PathBuf;
use std::{collections::HashMap, path::Path};
use walkdir::{DirEntry, WalkDir};

use super::epub::process_epub;
use super::rar::process_rar;
use super::zip::process_zip;

pub struct Scanner<'a> {
    pub db: &'a DatabaseConnection,
    pub event_queue: &'a Sender<Log>,
    pub libraries: Vec<library::Model>,
    // TODO: make hashmap of <String, series::Model> for faster lookup
    pub series: Vec<series::Model>,
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
        event_queue: &'a Sender<Log>,
        libraries: Vec<library::Model>,
        series: Vec<SeriesWithBookCount>,
        media: GetMediaQueryResult,
    ) -> Self {
        let mut hashmap = HashMap::new();

        for media in media {
            hashmap.insert(media.checksum.clone(), media);
        }

        Self {
            db,
            event_queue,
            libraries,
            series,
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

        let path = file.path();
        // let parent = file.path().parent().unwrap();

        // FIXME: very unsafe!!
        let series_id = self.get_series_id(path).unwrap();

        let metadata = match file.metadata() {
            Ok(metadata) => Some(metadata),
            _ => None,
        };

        let path_str = file.path().to_str().unwrap().to_string();
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
            series_id: Set(series_id),
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
            path: Set(path_str),
            ..Default::default()
        }
    }

    fn generate_series_model(path: &Path, library_id: i32) -> series::ActiveModel {
        let metadata = match path.metadata() {
            Ok(metadata) => Some(metadata),
            _ => None,
        };

        // TODO: remove the unsafe unwraps throughout this file
        let name = path.file_name().unwrap().to_str().unwrap().to_string();

        let mut updated_at: Option<NaiveDateTime> = None;

        if let Some(metadata) = metadata {
            // TODO: extract to fn somewhere
            updated_at = match metadata.modified() {
                Ok(st) => {
                    let dt: DateTime<Utc> = st.clone().into();
                    Some(dt.naive_utc())
                }
                Err(_) => Some(Utc::now().naive_utc()),
            };
        }

        series::ActiveModel {
            library_id: Set(library_id),
            title: Set(name),
            // book_count: Set(0),
            updated_at: Set(updated_at),
            path: Set(path.to_str().unwrap_or("").to_string()),
            ..Default::default()
        }
    }

    fn should_create_series(path: &Path) -> bool {
        let items = std::fs::read_dir(path);

        if items.is_err() {
            return false;
        }

        let items = items.unwrap();

        items
            .filter_map(|item| item.ok())
            .any(|f| f.path().is_file())
    }

    async fn insert_media(&self, model: media::ActiveModel) {
        // TODO: handle me please
        info!(
            "Insertion Result: {:?}",
            model.insert(self.db).await.map_err(|e| e.to_string())
        );
    }

    // TODO: fix result type
    async fn insert_series(&self, model: series::ActiveModel) -> Result<series::Model, String> {
        model.insert(self.db).await.map_err(|e| e.to_string())
    }

    fn series_exists(&self, path: &Path) -> bool {
        self.series
            .iter()
            .any(|series| series.path == path.to_str().unwrap_or("").to_string())
    }

    // TODO: I'm not sure I love this solution. I could check if the Path.parent is the series path, but
    // not sure about that either
    fn get_series_id(&self, path: &Path) -> Option<i32> {
        self.series
            .iter()
            .find(|series| {
                path.to_str()
                    .unwrap_or("")
                    .to_string()
                    .contains(&series.path)
            })
            .map(|series| series.id)
    }

    // FIXME: this needs to be refactored to:
    // - discover new series
    // - discover new media
    // - check existing media/series for changes
    // - update existing media/series if changed
    pub async fn do_scan(&mut self, library: &library::Model) {
        for entry in WalkDir::new(&library.path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            let library_path = PathBuf::from(&library.path);

            if path.is_dir() && !self.series_exists(path) {
                if path.to_path_buf().eq(&library_path) && !Self::should_create_series(path) {
                    continue;
                }

                let series_active_model = Self::generate_series_model(path, library.id);
                let res = self.insert_series(series_active_model).await;

                if let Ok(series) = res {
                    self.series.push(series);
                }

                continue;
            }

            if path.should_ignore() {
                continue;
            }

            let mut crc = Crc::new(path.to_str().unwrap());

            let checksum = crc.checksum();

            if self.media.contains_key(&checksum) {
                // TODO: check if media has changed
                continue;
            }

            let processed_info = match entry.file_name().to_str() {
                Some(name) if name.ends_with("cbr") => process_rar(&entry),
                Some(name) if name.ends_with("cbz") => process_zip(&entry),
                Some(name) if name.ends_with("epub") => process_epub(&entry),
                _ => {
                    let message = format!("Unsupported file type: {:?}", path);
                    info!("{}", &message);
                    // TODO: store in db?
                    let log = Log::warn(message);
                    let _ = self.event_queue.send(log);

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
                    // TODO: store in db?
                    let log = Log::error(e.to_string());
                    let _ = self.event_queue.send(log);
                }
            }
        }
    }

    pub async fn scan(&mut self) {
        // FIXME: don't want to clone
        for library in self.libraries.clone().iter() {
            self.do_scan(library).await;
        }
    }
}

pub async fn scan(
    conn: &DatabaseConnection,
    queue: &Sender<Log>,
    library_id: Option<i32>,
) -> Result<(), String> {
    // TODO: optimize these queries to one if possible.
    // TODO: use the new get_libraries_and_series function in queries::library

    let series = queries::series::get_series(conn).await?;

    let libraries: Vec<library::Model> = match library_id {
        Some(id) => queries::library::get_library_by_id(conn, id)
            .await?
            .map(|l| l.into())
            .into_iter()
            .collect(),
        None => queries::library::get_libraries(conn).await?,
    };

    if libraries.is_empty() {
        let mut message = "No libraries configured.".to_string();

        if library_id.is_some() {
            message = format!("No library with id: {}", library_id.unwrap());
        }

        // This will error if there are no listeners (which is fine)
        let _ = queue.send(Log::error(message.clone()));
        return Err(message);
    }

    let media = queries::media::get_media_with_library_and_series(conn, library_id).await?;

    let mut scanner = Scanner::new(conn, queue, libraries, series, media);
    scanner.scan().await;

    Ok(())
}
