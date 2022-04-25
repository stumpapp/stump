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
        models::SeriesWithMedia,
    },
};

// TODO: this disgusting thing needs to be refactored when https://github.com/Brendonovich/prisma-client-rust/issues/12
// gets implemented. I can't wait 😩
#[get("/series")]
pub async fn get_series(ctx: &Context, auth: StumpAuth) -> ApiResult<Json<Vec<SeriesWithMedia>>> {
    let db = ctx.get_db();

    let s = db
        .series()
        .find_many(vec![])
        .with(series::media::fetch(vec![]))
        .exec()
        .await?;

    let mut media_ids: Vec<String> = vec![];

    for s in s.iter() {
        let media = s.media()?;

        media_ids.append(&mut media.iter().map(|m| m.id.clone()).collect::<Vec<_>>());
    }

    let progress = db
        .read_progress()
        .find_many(vec![
            read_progress::media_id::in_vec(media_ids),
            read_progress::user_id::equals(auth.0.id),
        ])
        .exec()
        .await?;

    // I could barf
    Ok(Json(
        s.iter()
            .map(|s| (s.to_owned(), s.media().unwrap().to_owned(), &progress).into())
            .collect(),
    ))
}

#[get("/series/<id>")]
pub async fn get_series_by_id(
    id: String,
    ctx: &Context,
    auth: StumpAuth,
) -> ApiResult<Json<SeriesWithMedia>> {
    let db = ctx.get_db();

    let series = db
        .series()
        .find_unique(series::id::equals(id.clone()))
        .with(series::media::fetch(vec![]))
        .exec()
        .await?;

    if series.is_none() {
        return Err(ApiError::NotFound(format!(
            "Series with id {} not found",
            id
        )));
    }

    let series = series.unwrap();

    let media_ids = series
        .media()?
        .iter()
        .map(|m| m.id.clone())
        .collect::<Vec<_>>();

    let progress = db
        .read_progress()
        .find_many(vec![
            read_progress::media_id::in_vec(media_ids),
            read_progress::user_id::equals(auth.0.id),
        ])
        .exec()
        .await?;

    // this is so gross
    Ok(Json(
        (
            series.clone(),
            series.media().unwrap().to_owned(),
            &progress,
        )
            .into(),
    ))
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
