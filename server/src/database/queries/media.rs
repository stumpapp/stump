use crate::database::entities::{library, media, read_progress, series};
use crate::types::alias::{
    GetMediaWithProgress, GetMediaWithProgressRaw, GetUserMediaWithProgress,
};
use crate::types::dto::{GetMediaQuery, GetMediaQueryResult};
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, JoinType, QueryFilter, QuerySelect, RelationTrait,
};

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

pub async fn get_user_keep_reading_media(
    conn: &DatabaseConnection,
    user_id: i32,
) -> Result<GetMediaWithProgress, String> {
    let res: GetMediaWithProgressRaw = media::Entity::find()
        .find_with_related(read_progress::Entity)
        .all(conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(res
        .into_iter()
        .filter_map(|(media, progress)| {
            let exists_for_user = progress.iter().find(|p| p.user_id == user_id);

            if let Some(p) = exists_for_user {
                Some((media, p.to_owned()))
            } else {
                None
            }
        })
        .collect())
}

pub async fn get_user_media_with_progress(
    conn: &DatabaseConnection,
    user_id: i32,
    series_id: Option<i32>,
) -> Result<GetUserMediaWithProgress, String> {
    let res: GetMediaWithProgressRaw;

    if let Some(series_id) = series_id {
        res = media::Entity::find()
            .filter(media::Column::SeriesId.eq(series_id))
            .find_with_related(read_progress::Entity)
            .all(conn)
            .await
            .map_err(|e| e.to_string())?;
    } else {
        res = media::Entity::find()
            .find_with_related(read_progress::Entity)
            .all(conn)
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(res
        .into_iter()
        .map(|(media, progress)| {
            let users_progress = progress.iter().find(|p| p.user_id == user_id);

            if let Some(p) = users_progress {
                (media, Some(p.to_owned()))
            } else {
                (media, None)
            }
        })
        .collect())
}
