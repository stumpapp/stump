use crate::database::entities;
use crate::Log;
use sea_orm::{prelude::*, DatabaseConnection, DeleteResult};

pub async fn insert_log(
    conn: &DatabaseConnection,
    log: Log,
) -> Result<entities::log::Model, String> {
    let active_model: entities::log::ActiveModel = log.into();

    Ok(active_model.insert(conn).await.map_err(|e| e.to_string())?)
}

/// Get all logs from the database
pub async fn get_logs(conn: &DatabaseConnection) -> Result<Vec<entities::log::Model>, String> {
    Ok(entities::log::Entity::find()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn clear_logs(conn: &DatabaseConnection) -> Result<DeleteResult, String> {
    Ok(entities::log::Entity::delete_many()
        .exec(conn)
        .await
        .map_err(|e| e.to_string())?)
}
