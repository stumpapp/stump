use rocket::serde::{json::Json, Deserialize};

use crate::{
    database::queries,
    fs::media_file,
    guards::auth::StumpAuth,
    routing::error::{ApiError, ApiResult},
    types::{dto::media::GetMediaByIdWithProgress, rocket::ImageResponse},
    State,
};

// let media: GetMediaByIdWithProgress =
// queries::media::get_media_by_id_with_progress(state.get_connection(), id)
//     .await
//     .into()?;

type GetMediaResult = ApiResult<Json<GetMediaByIdWithProgress>>;

#[get("/media/<id>")]
pub async fn get_media(state: &State, id: i32) -> GetMediaResult {
    queries::media::get_media_by_id_with_progress(state.get_connection(), id)
        .await
        .map(|media| Ok(Json(media.into())))
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?
}

#[get("/media/<id>/thumbnail")]
pub async fn get_media_thumbnail(state: &State, id: i32) -> Result<Option<ImageResponse>, String> {
    let media = queries::media::get_media_by_id(state.get_connection(), id).await?;

    match media {
        Some(m) => Ok(Some(
            media_file::get_page(&m.path, 1).map_err(|e| e.to_string())?,
        )),
        None => Ok(None),
    }
}

type GetMediaPage = ApiResult<ImageResponse>;

// FIXME: redirect to last page for media on overflow
#[get("/media/<id>/page/<page>")]
pub async fn get_media_page(state: &State, id: i32, page: i32) -> GetMediaPage {
    let media = queries::media::get_media_by_id(state.get_connection(), id)
        .await
        .map_err(|e| ApiError::InternalServerError(e.to_string()))?;

    match media {
        Some(m) => {
            if page > m.pages {
                // FIXME: probably won't work lol
                Err(ApiError::Redirect(format!(
                    "/book/{}/read?page={}",
                    id, m.pages
                )))
            } else {
                Ok(media_file::get_page(&m.path, page as usize)
                    .map_err(|e| ApiError::InternalServerError(e.to_string()))?)
            }
        }
        None => Err(ApiError::NotFound(format!(
            "Media with id {} not found",
            id
        ))),
    }
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct UpdateProgress {
    page: i32,
}

#[put("/media/<id>/progress", data = "<progress>")]
pub async fn update_media_progress(
    state: &State,
    auth: StumpAuth,
    id: i32,
    progress: Json<UpdateProgress>,
) -> Result<(), String> {
    let existing_progress =
        queries::media::get_media_progress(state.get_connection(), id, auth.0.id).await?;

    if let Some(p) = existing_progress {
        queries::media::update_media_progress(state.get_connection(), p.into(), progress.page)
            .await?;
    } else {
        // queries::media::insert_media_progress(state.get_connection(), id, auth.0.id, progress.0.page)
        //     .await?;
    }

    Ok(())
}
