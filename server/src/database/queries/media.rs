use crate::database::entities::{library, media, series};
use crate::types::dto::{GetMediaQuery, GetMediaQueryResult};
use sea_orm::{DatabaseConnection, EntityTrait, JoinType, QuerySelect, RelationTrait, Set};

pub async fn get_media_with_library_and_series(
    conn: &DatabaseConnection,
) -> Result<GetMediaQueryResult, String> {
    Ok(media::Entity::find()
        .column_as(library::Column::Id, "library_id")
        .column_as(library::Column::Path, "library_path")
        .column_as(series::Column::Path, "series_path")
        .join(JoinType::InnerJoin, media::Relation::Series.def())
        .group_by(series::Column::Id)
        .join(JoinType::InnerJoin, series::Relation::Library.def())
        .group_by(library::Column::Id)
        .into_model::<GetMediaQuery>()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}
