use rocket::serde::json::Json;

use crate::{
    prisma::{media, series},
    types::alias::{ApiResult, State},
};

#[get("/series")]
pub async fn get_series(state: &State) -> ApiResult<Json<Vec<series::Data>>> {
    let db = state.get_db();

    // FIXME: need to load in media::read_progresses
    let s = db
        .series()
        .find_many(vec![])
        .with(series::media::fetch(vec![]))
        .exec()
        .await?;

    Ok(Json(s))
}
