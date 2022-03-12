use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use chrono::{DateTime, NaiveDateTime, Utc};
use entity::sea_orm::{self, ActiveModelTrait};
use entity::{library, series, util::FileStatus};
use sea_orm::{DatabaseConnection, Set};

use rocket::tokio::sync::broadcast::Sender;
use walkdir::WalkDir;

use crate::{
    database::queries,
    event::{event::Event, handler::EventHandler},
    types::dto::{GetMediaQuery, GetMediaQueryResult},
    State,
};

// TODO: use ApiErrors here!

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
    pub event_handler: &'a EventHandler,
    // TODO: make hashmap of <String, series::Model> for faster lookup
    pub series: Vec<series::Model>,
    // checksum -> obj
    pub media: HashMap<String, GetMediaQuery>,
}

impl<'a> Scanner<'a> {
    pub fn new(
        db: &'a DatabaseConnection,
        // event_log_queue: &'a Sender<Log>,
        event_handler: &'a EventHandler,
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
            event_handler,
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
                    self.event_handler
                        .log_error(format!("Missing file: {}", path));
                }
            }
            Err(err) => {
                self.event_handler.log_error(err);
            }
        }
    }

    async fn set_series_status(&self, id: i32, status: FileStatus, path: String) {
        match queries::series::set_status(self.db, id, status).await {
            Ok(_) => {
                info!("set series status: {:?} -> {:?}", path, status);
                if status == FileStatus::Missing {
                    self.event_handler
                        .log_error(format!("Missing file: {}", path));
                }
            }
            Err(err) => {
                self.event_handler.log_error(err);
            }
        }
    }

    async fn create_series(&self, path: &Path, library_id: i32) -> Option<series::Model> {
        let series = generate_series_model(path, library_id);

        match series.insert(self.db).await {
            Ok(m) => {
                info!("Created new series: {:?}", m);
                self.event_handler
                    .emit_event(Event::series_created(m.clone()));
                Some(m)
            }
            Err(err) => {
                self.event_handler.log_error(err.to_string());
                None
            }
        }
    }

    pub async fn scan_library(&mut self, library: &library::Model) {
        let library_path = PathBuf::from(&library.path);

        let mut visited_series = HashMap::<i32, bool>::new();
        let mut visited_media = HashMap::<i32, bool>::new();

        for entry in WalkDir::new(&library.path)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();

            let series = self.get_series(&path);
            let series_exists = series.is_some();

            if path.is_dir() && !series_exists {
                if path.to_path_buf().eq(&library_path) && !dir_has_files(path) {
                    info!("Skipping library directory - contains no files.");
                    continue;
                }

                match self.create_series(path, library.id).await {
                    Some(series) => {
                        visited_series.insert(series.id, true);
                        self.series.push(series);
                    }
                    None => {}
                }

                continue;
            }

            if series_exists {
                let series = series.unwrap();
                info!("Existing series: {:?}", series);
                visited_series.insert(series.id, true);
                continue;
            } else if path.should_ignore() {
                // info!("Ignoring: {:?}", path);
                continue;
            }

            let key = path.to_str().unwrap_or("").to_string();

            if self.media.contains_key(&key) {
                // info!("Existing media: {:?}", path);
                let id = self.media.get(&key).unwrap().id;
                visited_media.insert(id, true);
                // self.analyze_media(key).await;
                continue;
            }

            // info!("New media: {:?}", path);

            // TODO: make me
        }

        for series in self.series.iter() {
            match visited_series.get(&series.id) {
                Some(true) => {
                    if series.status == FileStatus::Missing {
                        self.set_series_status(series.id, FileStatus::Ready, series.path.clone())
                            .await;
                    }
                }
                _ => {
                    if series.library_id == library.id {
                        info!("MOVED/MISSING SERIES: {}", series.path);
                        self.set_series_status(series.id, FileStatus::Missing, series.path.clone())
                            .await;
                    }
                }
            }
        }

        for media in self.media.values() {
            match visited_media.get(&media.id) {
                Some(true) => {
                    if media.status == FileStatus::Missing {
                        self.set_media_status(media.id, FileStatus::Ready, media.path.clone())
                            .await;
                    }
                }
                _ => {
                    if media.library_id == library.id {
                        info!("MOVED/MISSING MEDIA: {}", media.path);
                        self.set_media_status(media.id, FileStatus::Missing, media.path.clone())
                            .await;
                    }
                }
            }
        }
    }
}

pub async fn scan(state: &State, library_id: Option<i32>) -> Result<(), String> {
    let conn = state.get_connection();
    let event_handler = state.get_event_handler();

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

        event_handler.log_error(message.clone());

        return Err(message);
    }

    let series = queries::series::get_series_in_library(conn, library_id).await?;

    // println!("{:?}", series);

    let media = queries::media::get_media_with_library_and_series(conn, library_id).await?;

    // println!("{:?}", media);

    let mut scanner = Scanner::new(conn, event_handler, series, media);

    for library in libraries {
        scanner.scan_library(&library).await;
    }

    Ok(())
}
