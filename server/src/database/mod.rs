use anyhow::Result;
use sea_orm::{
    ConnectionTrait, DatabaseConnection, DbBackend, DbErr, EntityTrait, ExecResult, Schema,
    Statement,
};

pub mod connection;
pub mod entities;
pub mod queries;

pub struct Database {
    pub connection: DatabaseConnection,
}

impl Database {
    pub fn new(connection: DatabaseConnection) -> Self {
        Database { connection }
    }

    pub fn get_seaorm_stmt<E: EntityTrait>(&self, e: E) -> Statement {
        let db_backend = DbBackend::Sqlite;
        let schema = Schema::new(db_backend);

        db_backend.build(schema.create_table_from_entity(e).if_not_exists())
    }

    pub async fn run_seaorm_stmt(&self, stmt: Statement) -> Result<ExecResult, DbErr> {
        self.connection.execute(stmt).await
    }

    async fn create_default_preferences(&self) -> Result<(), String> {
        let db_backend = DbBackend::Sqlite;

        let _: ExecResult = self
            .connection
            .execute(Statement::from_string(
                db_backend,
                "INSERT INTO `server_preferences` (`id`) SELECT 0 WHERE NOT EXISTS (SELECT * FROM `server_preferences`);".to_owned(),
            ))
            .await.map_err(|e| e.to_string())?;

        Ok(())
    }

    // TODO: use new migration manager -> https://github.com/SeaQL/sea-orm/tree/master/examples/rocket_example
    pub async fn run_migration_up(&self) -> Result<(), String> {
        let mut stmts = vec![
            self.get_seaorm_stmt(entities::server_preferences::Entity),
            self.get_seaorm_stmt(entities::user::Entity),
            self.get_seaorm_stmt(entities::media::Entity),
            self.get_seaorm_stmt(entities::read_progress::Entity),
            self.get_seaorm_stmt(entities::series::Entity),
            self.get_seaorm_stmt(entities::library::Entity),
            self.get_seaorm_stmt(entities::log::Entity),
        ];

        for stmt in stmts.iter_mut() {
            self.run_seaorm_stmt(stmt.to_owned())
                .await
                .map_err(|e| e.to_string())?;
        }

        Ok(self.create_default_preferences().await?)
    }

    pub async fn run_migration_down(&self) {
        unimplemented!()
    }

    pub fn get_connection(&self) -> &DatabaseConnection {
        &self.connection
    }
}
