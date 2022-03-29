use entity::sea_orm::{self, ActiveModelTrait};
use entity::util::FileStatus;
use entity::{media, series};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set};

use crate::types::dto::series::SeriesWithBookCount;

pub async fn get_series(conn: &DatabaseConnection) -> Result<Vec<SeriesWithBookCount>, String> {
    Ok(series::Entity::find_with_book_count()
        .into_model::<SeriesWithBookCount>()
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

pub async fn get_lastest_series(
    conn: &DatabaseConnection,
) -> Result<Vec<SeriesWithBookCount>, String> {
    Ok(series::Entity::find_with_book_count()
        .order_by_desc(series::Column::UpdatedAt)
        .into_model::<SeriesWithBookCount>()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_series_by_id(
    conn: &DatabaseConnection,
    id: String,
) -> Result<Option<series::Model>, String> {
    Ok(series::Entity::find_with_book_count()
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

pub async fn set_status(
    conn: &DatabaseConnection,
    id: i32,
    status: FileStatus,
) -> Result<(), String> {
    let series = series::Entity::find_by_id(id)
        .one(conn)
        .await
        .map_err(|e| e.to_string())?;

    match series {
        Some(s) => {
            let mut active_model: series::ActiveModel = s.into();
            active_model.status = Set(status);
            active_model.update(conn).await.map_err(|e| e.to_string())?;
            Ok(())
        }
        None => return Err("No series found".to_string()),
    }
}
