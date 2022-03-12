pub mod auth;
pub mod library;
pub mod log;
pub mod media;
pub mod series;

use crate::{fs, State};

use rocket::response::stream::{Event, EventStream};
use rocket::tokio::{select, sync::broadcast::error::RecvError};
use rocket::Shutdown;

// BASE URL: /api

/// A handler for GET /api/scan. Scans the library for new media files and updates the database accordingly.
/// By default, it will scan all library folders. If a folder is specified, it will only scan that folder.
#[get("/scan?<library_id>")]
pub async fn scan(state: &State, library_id: Option<i32>) -> Result<(), String> {
    Ok(fs::scanner::scan(state, library_id).await?)
}

#[get("/events")]
pub async fn event_listener(state: &State, mut end: Shutdown) -> EventStream![] {
    let event_handler = state.get_event_handler();
    let mut rx = event_handler.event_subscribe();

    EventStream! {
        loop {
            let e = select! {
                e = rx.recv() => match e {
                    Ok(e) => e,
                    Err(RecvError::Closed) => break,
                    Err(RecvError::Lagged(_)) => continue,
                },
                _ = &mut end => break,
            };

            yield Event::json(&e);
        }
    }
}
