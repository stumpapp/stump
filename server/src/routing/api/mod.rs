pub mod library;
pub mod log;
pub mod media;

use rocket::response::stream::{Event, EventStream};
use rocket::tokio::{select, sync::broadcast::error::RecvError};
use rocket::Shutdown;

use crate::{fs, State};

// BASE URL: /api

/// A handler for GET /api/scan. Scans the library for new media files and updates the database accordingly.
/// By default, it will scan all library folders. If a folder is specified, it will only scan that folder.
#[get("/scan?<library_id>")]
pub async fn scan(state: &State, library_id: Option<String>) -> Result<(), String> {
    let connection = state.get_connection();
    let queue = state.get_queue();

    fs::scan::scan(connection, queue, library_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// A handler for listening to events from the queue. This will be used to send updates to a client.
/// The client will be notified of events when it is listening.
#[get("/events")]
pub async fn log_listener(state: &State, mut end: Shutdown) -> EventStream![] {
    let queue = state.get_queue();
    let mut rx = queue.subscribe();

    EventStream! {
        loop {
            let log = select! {
                log = rx.recv() => match log {
                    Ok(log) => log,
                    Err(RecvError::Closed) => break,
                    Err(RecvError::Lagged(_)) => continue,
                },
                _ = &mut end => break,
            };

            yield Event::json(&log);
        }
    }
}
