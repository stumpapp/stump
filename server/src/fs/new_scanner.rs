use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use chrono::{DateTime, NaiveDateTime, Utc};
use sea_orm::{DatabaseConnection, Set};

use rocket::tokio::sync::broadcast::Sender;
use walkdir::WalkDir;

use crate::{
    database::{
        entities::{library, series},
        queries,
    },
    logging::Log,
    types::dto::{GetMediaQuery, GetMediaQueryResult},
};

use super::FileStatus;

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
        book_count: Set(0),
        updated_at: Set(updated_at),
        path: Set(path.to_str().unwrap_or("").to_string()),
        ..Default::default()
    }
}

fn dir_has_files(path: &Path) -> bool {
    let items = std::fs::read_dir(path);

    if items.is_err() {
        return false;
    }

    let items = items.unwrap();

    items
        .filter_map(|item| item.ok())
        .any(|f| !f.path().should_ignore())
}

struct Scanner<'a> {
    pub db: &'a DatabaseConnection,
    pub event_queue: &'a Sender<Log>,
    pub libraries: Vec<library::Model>,
    // TODO: make hashmap of <String, series::Model> for faster lookup
    pub series: Vec<series::Model>,
    // checksum -> obj
    pub media: HashMap<String, GetMediaQuery>,
}

impl<'a> Scanner<'a> {
    pub fn new(
        db: &'a DatabaseConnection,
        event_queue: &'a Sender<Log>,
        libraries: Vec<library::Model>,
        series: Vec<series::Model>,
        media: GetMediaQueryResult,
    ) -> Self {
        let mut hashmap = HashMap::new();

        for media in media {
            // hashmap.insert(media.checksum.clone(), media);
            hashmap.insert(media.path.clone(), media);
        }

        Self {
            db,
            event_queue,
            libraries,
            series,
            media: hashmap,
        }
    }

    async fn analyze_media(&self, key: String) {
        let media = self.media.get(&key).unwrap();

        let id = media.id;

        println!("analyzing media: {:?}", media);

        if media.status == FileStatus::Missing {
            info!("Media found");
            self.set_media_status(id, FileStatus::Ready, media.path.clone())
                .await;
        }

        // TODO: more checks??
    }

    fn get_series(&self, path: &Path) -> Option<&series::Model> {
        self.series
            .iter()
            .find(|series| path.to_str().unwrap_or("").to_string().eq(&series.path))
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

    fn series_exists(&self, path: &Path) -> bool {
        self.get_series(path).is_some()
    }

    async fn handle_new_media() {}

    async fn set_media_status(&self, id: i32, status: FileStatus, path: String) {
        match queries::media::set_status(self.db, id, status).await {
            Ok(_) => {
                info!("set media status: {:?} -> {:?}", path, status);
                if status == FileStatus::Missing {
                    let _ = self
                        .event_queue
                        .send(Log::error(format!("Missing file: {}", path)));
                }
            }
            Err(err) => {
                let log = Log::error(err);
                let _ = self.event_queue.send(log);
            }
        }
    }

    pub async fn scan_library(&self, library: &library::Model) {
        let library_path = PathBuf::from(&library.path);

        let mut visited_series = HashMap::<i32, bool>::new();
        let mut visited_media = HashMap::<i32, bool>::new();

        for entry in WalkDir::new(&library.path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            println!("PATH: {:?}", entry.path());
            let path = entry.path();

            let series = self.get_series(&path);
            let series_exists = series.is_some();

            if path.is_dir() && !series_exists {
                if path.to_path_buf().eq(&library_path) && !dir_has_files(path) {
                    info!("Skipping library directory - contains no files.");
                    continue;
                }

                info!("New series: {:?}", path);
                continue;
            }

            if series_exists {
                info!("Existing series: {:?}", path);
                let series = series.unwrap();
                visited_series.insert(series.id, true);
                continue;
            } else if path.should_ignore() {
                info!("Ignoring: {:?}", path);
                continue;
            }

            let key = path.to_str().unwrap_or("").to_string();

            println!("KEY: {:?}", key);

            if self.media.contains_key(&key) {
                info!("Existing media: {:?}", path);
                let id = self.media.get(&key).unwrap().id;
                visited_media.insert(id, true);
                self.analyze_media(key).await;
                continue;
            }

            info!("New media: {:?}", path);

            // TODO: make me
        }

        for series in self.series.iter() {
            match visited_series.get(&series.id) {
                Some(true) => continue,
                _ => info!("MOVED/MISSING SERIES: {}", series.path),
            }
        }

        for media in self.media.values() {
            match visited_media.get(&media.id) {
                Some(true) => continue,
                _ => {
                    info!("MOVED/MISSING MEDIA: {}", media.path);
                    self.set_media_status(media.id, FileStatus::Missing, media.path.clone())
                        .await;
                }
            }
        }
    }

    pub async fn scan(&mut self) {
        for library in self.libraries.iter().to_owned() {
            self.scan_library(library).await;
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

    let series = queries::series::get_series_in_library(conn, library_id).await?;

    println!("{:?}", series);

    let media = queries::media::get_media_with_library_and_series(conn, library_id).await?;

    println!("{:?}", media);

    let mut scanner = Scanner::new(conn, queue, libraries, series, media);
    scanner.scan().await;

    Ok(())
}
