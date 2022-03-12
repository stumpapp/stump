use entity::sea_orm::{self, ActiveModelTrait};
use rocket::tokio::sync::broadcast::{channel, Sender};
use sea_orm::DatabaseConnection;

use crate::{
    database::Database,
    event::{
        event::Event,
        handler::EventHandler,
        log::{Log, LogTrait},
    },
};

pub struct AppState {
    db: Database,
    event_handler: EventHandler,
}
// TODO: some actual error handling
impl AppState {
    pub fn new(db: Database) -> Self {
        AppState {
            db,
            event_handler: EventHandler::new(),
        }
    }

    pub fn get_connection(&self) -> &DatabaseConnection {
        self.db.get_connection()
    }

    pub fn get_event_handler(&self) -> &EventHandler {
        &self.event_handler
    }

    async fn persist_log(&self, log: Log) {
        let active_model: entity::log::ActiveModel = log.into_active_model();

        active_model
            .insert(self.get_connection())
            .await
            .expect("Failed to insert log");
    }

    /// Emit and persist an error log message
    pub fn error(&self, message: String) {
        self.persist_log(self.event_handler.log_error(message));
    }

    /// Emit and persist a warning log message
    pub fn warn(&self, message: String) {
        self.persist_log(self.event_handler.log_warn(message));
    }

    /// Emit and persist an info log message
    pub fn info(&self, message: String) {
        self.persist_log(self.event_handler.log_info(message));
    }

    /// Emit and persist a debug log message
    pub fn debug(&self, message: String) {
        self.persist_log(self.event_handler.log_debug(message));
    }

    /// Emit an event
    pub fn event(&self, event: Event) {
        self.event_handler.emit_event(event);
    }
}

pub type State = rocket::State<AppState>;
