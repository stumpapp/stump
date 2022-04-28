use prisma_client_rust::Direction;
use rocket::serde::json::Json;

use crate::{
    fs,
    guards::auth::StumpAuth,
    prisma::{media, read_progress, series},
    types::{
        alias::{ApiResult, Context},
        errors::ApiError,
        http::ImageResponse,
    },
};

#[get("/series")]
pub async fn get_series(ctx: &Context, auth: StumpAuth) -> ApiResult<Json<Vec<series::Data>>> {
    let db = ctx.get_db();

    Ok(Json(
        db.series()
            .find_many(vec![])
            .with(
                series::media::fetch(vec![])
                    .with(media::read_progresses::fetch(vec![
                        read_progress::user_id::equals(auth.0.id),
                    ]))
                    .order_by(media::name::order(Direction::Asc)),
            )
            .exec()
            .await?,
    ))
}

#[get("/series/<id>")]
pub async fn get_series_by_id(
    id: String,
    ctx: &Context,
    auth: StumpAuth,
) -> ApiResult<Json<series::Data>> {
    let db = ctx.get_db();

    let series = db
        .series()
        .find_unique(series::id::equals(id.clone()))
        .with(
            series::media::fetch(vec![])
                .with(media::read_progresses::fetch(vec![
                    read_progress::user_id::equals(auth.0.id),
                ]))
                .order_by(media::name::order(Direction::Asc)),
        )
        .exec()
        .await?;

    if series.is_none() {
        return Err(ApiError::NotFound(format!(
            "Series with id {} not found",
            id
        )));
    }

    Ok(Json(series.unwrap()))
}

#[get("/series/<id>/thumbnail")]
pub async fn get_series_thumbnail(
    id: String,
    ctx: &Context,
    _auth: StumpAuth,
) -> ApiResult<ImageResponse> {
    let db = ctx.get_db();

    let media = db
        .media()
        .find_first(vec![media::series_id::equals(Some(id.clone()))])
        .order_by(media::name::order(Direction::Asc))
        .exec()
        .await?;

    if media.is_none() {
        return Err(ApiError::NotFound(format!(
            "Series with id {} not found",
            id
        )));
    }

    let media = media.unwrap();

    Ok(fs::media_file::get_page(media.path.as_str(), 1)?)
}
