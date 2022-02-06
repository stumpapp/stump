pub mod library_api;
pub mod media_api;

use rocket::response::stream::{Event, EventStream};
use rocket::tokio::{select, sync::broadcast::error::RecvError, time::Duration};
use rocket::Shutdown;
use sea_orm::{QuerySelect, RelationTrait};

use crate::{fs, Log, State};

// BASE URL: /api

/// A handler for GET /api/scan. Scans the library for new media files and updates the database accordingly.
#[get("/scan")]
pub async fn scan(state: &State) -> Result<(), String> {
    let connection = state.get_connection();
    let queue = state.get_queue();

    fs::scan::scan(connection, queue)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

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

// TODO: remove me
#[post("/event")]
pub async fn test_log_event(state: &State) {
    let queue = state.get_queue();

    let _res = queue.send(Log {
        level: "info".into(),
        message: "test".into(),
    });
}
