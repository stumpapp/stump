use rocket::serde::{json::Json, Deserialize};

use crate::{
    database::queries, fs::media_file, guards::auth::StumpAuth, types::rocket::ImageResponse, State,
};

// let media: GetMediaByIdWithProgress =
// queries::media::get_media_by_id_with_progress(state.get_connection(), id)
//     .await
//     .into()?;

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

#[derive(Deserialize)]
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
