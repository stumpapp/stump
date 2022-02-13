use crate::{database::queries, fs::media_file, types::rocket::ImageResponse, State};

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
