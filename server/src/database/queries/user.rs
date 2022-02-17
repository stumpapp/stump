use entity::sea_orm;
use entity::user;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};

pub async fn get_user_by_username(
    username: &str,
    conn: &DatabaseConnection,
) -> Result<Option<user::Model>, String> {
    Ok(user::Entity::find()
        .filter(user::Column::Username.eq(username))
        .one(conn)
        .await
        .map_err(|e| e.to_string())?)
}
