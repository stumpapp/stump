use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder};

use crate::database::entities::{media, series};

pub async fn get_series(conn: &DatabaseConnection) -> Result<Vec<series::Model>, String> {
    Ok(series::Entity::find()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_lastest_series(conn: &DatabaseConnection) -> Result<Vec<series::Model>, String> {
    Ok(series::Entity::find()
        .order_by_desc(series::Column::UpdatedAt)
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_series_by_id(
    conn: &DatabaseConnection,
    id: String,
) -> Result<Option<series::Model>, String> {
    Ok(series::Entity::find()
        .filter(series::Column::Id.eq(id))
        .one(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_series_by_id_with_media(
    conn: &DatabaseConnection,
    id: String,
) -> Result<Vec<(series::Model, Vec<media::Model>)>, String> {
    Ok(series::Entity::find()
        .filter(series::Column::Id.eq(id))
        .find_with_related(media::Entity)
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}
