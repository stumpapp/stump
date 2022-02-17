use entity::sea_orm;
use entity::{library, series};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

pub async fn get_libraries(conn: &DatabaseConnection) -> Result<Vec<library::Model>, String> {
    Ok(library::Entity::find()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_library_by_id(
    conn: &DatabaseConnection,
    id: i32,
) -> Result<Option<library::Model>, String> {
    Ok(library::Entity::find()
        .filter(library::Column::Id.eq(id))
        .one(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_libraries_and_series(
    conn: &DatabaseConnection,
) -> Result<Vec<(library::Model, Vec<series::Model>)>, String> {
    Ok(library::Entity::find()
        .find_with_related(series::Entity)
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_library_by_id_with_series(
    conn: &DatabaseConnection,
    id: i32,
) -> Result<Vec<(library::Model, Vec<series::Model>)>, String> {
    Ok(library::Entity::find()
        .filter(library::Column::Id.eq(id))
        .find_with_related(series::Entity)
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}
