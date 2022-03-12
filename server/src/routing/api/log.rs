use rocket::response::stream::{Event, EventStream};
use rocket::serde::json::Json;
use rocket::tokio::{select, sync::broadcast::error::RecvError};
use rocket::Shutdown;

use crate::database::queries;
use crate::State;

type GetLogs = Json<Vec<entity::log::Model>>;

#[get("/logs")]
pub async fn get_logs(state: &State) -> Result<GetLogs, String> {
    Ok(Json(queries::log::get_logs(state.get_connection()).await?))
}

/// A handler for listening to events from the queue. This will be used to send updates to a client.
/// The client will be notified of events when it is listening.
#[get("/logs/listen")]
pub async fn log_listener(state: &State, mut end: Shutdown) -> EventStream![] {
    let event_handler = state.get_event_handler();
    let mut rx = event_handler.log_subscribe();

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
