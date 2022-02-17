use entity::sea_orm;
use entity::{media, read_progress, series};
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait,
};

pub async fn get_series(conn: &DatabaseConnection) -> Result<Vec<series::Model>, String> {
    Ok(series::Entity::find()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_series_in_library(
    conn: &DatabaseConnection,
    library_id: Option<i32>,
) -> Result<Vec<series::Model>, String> {
    let mut query = series::Entity::find();

    if let Some(library_id) = library_id {
        query = query.filter(series::Column::LibraryId.eq(library_id));
    }

    Ok(query.all(conn).await.map_err(|e| e.to_string())?)
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
