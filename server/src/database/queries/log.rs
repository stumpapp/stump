use crate::logging::LogTrait;
use crate::Log;
use entity::log::{Entity as LogEntity, Model as LogModel};
use entity::sea_orm;
use sea_orm::{prelude::*, DatabaseConnection, DeleteResult};

pub async fn insert_log(conn: &DatabaseConnection, log: Log) -> Result<LogModel, String> {
    let active_model: entity::log::ActiveModel = log.into_active_model();

    Ok(active_model.insert(conn).await.map_err(|e| e.to_string())?)
}

/// Get all logs from the database
pub async fn get_logs(conn: &DatabaseConnection) -> Result<Vec<LogModel>, String> {
    Ok(LogEntity::find()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn clear_logs(conn: &DatabaseConnection) -> Result<DeleteResult, String> {
    Ok(LogEntity::delete_many()
        .exec(conn)
        .await
        .map_err(|e| e.to_string())?)
}
