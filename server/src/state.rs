use crate::{Database, Log};
use rocket::tokio::sync::broadcast::Sender;
use sea_orm::DatabaseConnection;

pub struct AppState {
    db: Database,
    queue: Sender<Log>,
}

impl AppState {
    pub fn new(db: Database, queue: Sender<Log>) -> Self {
        AppState { db, queue }
    }

    pub fn get_connection(&self) -> &DatabaseConnection {
        self.db.get_connection()
    }

    pub fn get_queue(&self) -> &Sender<Log> {
        &self.queue
    }
}

pub type State = rocket::State<AppState>;
