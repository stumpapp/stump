use crate::database::entities::{library, media, read_progress, series};
use crate::types::dto::{
    GetMedaWithProgress, GetMedaWithProgressRaw, GetMediaQuery, GetMediaQueryResult,
};
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

// pub async fn get_media_with_progres(
//     conn: &DatabaseConnection,
// ) -> Result<GetMedaWithProgress, String> {
//     let res: GetMedaWithProgressRaw = media::Entity::find()
//         .find_with_related(read_progress::Entity)
//         .all(conn)
//         .await
//         .map_err(|e| e.to_string())?;

//     Ok(res
//         .into_iter()
//         .map(|(media, progress)| (media, progress.into_iter().next()))
//         .collect())
// }
