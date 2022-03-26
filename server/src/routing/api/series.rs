use entity::series;
use rocket::serde::json::Json;

use crate::{
    database::queries,
    fs::media_file,
    types::{
        dto::series::{GetSeriesById, SeriesWithBookCount},
        rocket::ImageResponse,
    },
    State,
};

type GetSeriesList = Json<Vec<SeriesWithBookCount>>;

type GetSeriesByIdResponse = Json<Option<GetSeriesById>>;

#[get("/series")]
pub async fn get_series(state: &State) -> Result<GetSeriesList, String> {
    Ok(Json(
        queries::series::get_series(state.get_connection()).await?,
    ))
}

// TODO: grab progress
#[get("/series/<id>")]
pub async fn get_series_by_id(state: &State, id: i32) -> Result<GetSeriesByIdResponse, String> {
    let res = queries::series::get_series_by_id_with_media(state.get_connection(), id.to_string())
        .await?;

    if res.is_empty() {
        return Ok(Json(None));
    } else if res.len() > 1 {
        return Err("Multiple series with the same id found".to_string());
    }

    Ok(Json(Some(res.into_iter().next().unwrap().into())))
}

#[get("/series/<id>/thumbnail")]
pub async fn get_series_thumbnail(state: &State, id: i32) -> Result<Option<ImageResponse>, String> {
    let series_with_media =
        queries::series::get_series_by_id_with_media(state.get_connection(), id.to_string())
            .await?;

    if series_with_media.is_empty() {
        return Ok(None);
    }

    let (_, media) = series_with_media[0].to_owned();

    if media.is_empty() {
        return Ok(None);
    }

    Ok(Some(
        media_file::get_page(&media[0].path, 1).map_err(|e| e.to_string())?,
    ))
}
