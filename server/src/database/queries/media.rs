use crate::types::alias::{
    GetMediaWithProgress, GetMediaWithProgressRaw, GetUserMediaWithProgress, MediaWithMaybeProgress,
};
use crate::types::dto::{GetMediaQuery, GetMediaQueryResult};
use entity::sea_orm;
use entity::{library, media, read_progress, series, util::FileStatus};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, JoinType, QueryFilter,
    QuerySelect, RelationTrait, Set,
};

pub async fn get_media_with_library_and_series(
    conn: &DatabaseConnection,
    id: Option<i32>,
) -> Result<GetMediaQueryResult, String> {
    let mut query = media::Entity::find()
        .column_as(library::Column::Id, "library_id")
        .column_as(library::Column::Path, "library_path")
        .column_as(series::Column::Path, "series_path")
        .join(JoinType::InnerJoin, media::Relation::Series.def())
        .group_by(series::Column::Id)
        .join(JoinType::InnerJoin, series::Relation::Library.def())
        .group_by(library::Column::Id);

    if let Some(id) = id {
        query = query.filter(library::Column::Id.eq(id));
    }

    Ok(query
        .into_model::<GetMediaQuery>()
        .all(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn get_media_by_id(
    conn: &DatabaseConnection,
    id: i32,
) -> Result<Option<media::Model>, String> {
    let res = media::Entity::find()
        .filter(media::Column::Id.eq(id))
        .one(conn)
        .await
        .map_err(|e| e.to_string())?;

    Ok(res)
}

pub async fn get_media_by_id_with_progress(
    conn: &DatabaseConnection,
    id: i32,
) -> Result<MediaWithMaybeProgress, String> {
    let res = media::Entity::find()
        .filter(media::Column::Id.eq(id))
        .find_with_related(read_progress::Entity)
        .one(conn)
        .await
        .map_err(|e| e.to_string())?;

    match res {
        Some(m) => Ok(m),
        None => Err("No media found".to_string()),
    }
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

pub async fn get_media_progress(
    conn: &DatabaseConnection,
    media_id: i32,
    user_id: i32,
) -> Result<Option<read_progress::Model>, String> {
    Ok(read_progress::Entity::find()
        .filter(read_progress::Column::MediaId.eq(media_id))
        .filter(read_progress::Column::UserId.eq(user_id))
        .one(conn)
        .await
        .map_err(|e| e.to_string())?)
}

pub async fn update_media_progress(
    conn: &DatabaseConnection,
    mut active_model: read_progress::ActiveModel,
    page: i32,
) -> Result<(), String> {
    active_model.page = Set(page);
    active_model.update(conn).await.map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn set_status(
    conn: &DatabaseConnection,
    id: i32,
    status: FileStatus,
) -> Result<(), String> {
    let media = get_media_by_id(conn, id).await.map_err(|e| e.to_string())?;

    match media {
        Some(m) => {
            let mut active_model: media::ActiveModel = m.into();
            active_model.status = Set(status);
            active_model.update(conn).await.map_err(|e| e.to_string())?;
            Ok(())
        }
        None => return Err("No media found".to_string()),
    }
}
