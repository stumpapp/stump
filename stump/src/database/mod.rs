use anyhow::Result;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, ExecResult, Schema};

pub mod connection;
pub mod entities;

pub struct Database {
    pub connection: DatabaseConnection,
}

impl Database {
    pub fn new(connection: DatabaseConnection) -> Self {
        Database { connection }
    }

    // TODO: better error handling
    // TODO: just make a sql file smh
    pub async fn run_migration_up(&self) -> Result<(), String> {
        let db_backend = DbBackend::Sqlite;
        let schema = Schema::new(db_backend);

        // let media_creation_statement = db_backend.build(
        //     schema
        //         .create_table_from_entity(entities::media::Entity)
        //         .if_not_exists(),
        // );

        // self.connection
        //     .execute(media_creation_statement)
        //     .await
        //     .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub async fn run_migration_down(&self) {
        unimplemented!()
    }

    pub fn get_connection(&self) -> &DatabaseConnection {
        &self.connection
    }
}
