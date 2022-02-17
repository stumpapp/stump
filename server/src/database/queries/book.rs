use entity::media;
use entity::sea_orm;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

pub async fn get_book_by_id(
    conn: &DatabaseConnection,
    id: String,
) -> Result<Option<media::Model>, String> {
    let book = media::Entity::find()
        .filter(media::Column::Id.eq(id))
        .one(conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(book)
}
