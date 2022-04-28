use rocket::{fs::NamedFile, serde::json::Json};
use serde::Deserialize;

use crate::{
    fs,
    guards::auth::StumpAuth,
    prisma::{media, read_progress, user},
    types::{
        alias::{ApiResult, Context},
        errors::ApiError,
        http::ImageResponse,
    },
};

#[get("/media")]
pub async fn get_media(ctx: &Context, auth: StumpAuth) -> ApiResult<Json<Vec<media::Data>>> {
    let db = ctx.get_db();

    Ok(Json(
        db.media()
            .find_many(vec![])
            .with(media::read_progresses::fetch(vec![
                read_progress::user_id::equals(auth.0.id),
            ]))
            .exec()
            .await?,
    ))
}

#[get("/media/<id>")]
pub async fn get_media_by_id(
    id: String,
    ctx: &Context,
    auth: StumpAuth,
) -> ApiResult<Json<media::Data>> {
    let db = ctx.get_db();

    let book = db
        .media()
        .find_unique(media::id::equals(id.clone()))
        .with(media::read_progresses::fetch(vec![
            read_progress::user_id::equals(auth.0.id),
        ]))
        .exec()
        .await?;

    if book.is_none() {
        return Err(ApiError::NotFound(format!(
            "Media with id {} not found",
            id
        )));
    }

    Ok(Json(book.unwrap()))
}

#[get("/media/<id>/file")]
pub async fn get_media_file(id: String, ctx: &Context, _auth: StumpAuth) -> ApiResult<NamedFile> {
    let db = ctx.get_db();

    let media = db
        .media()
        .find_unique(media::id::equals(id.clone()))
        .exec()
        .await?;

    if media.is_none() {
        return Err(ApiError::NotFound(format!(
            "Media with id {} not found",
            id
        )));
    }

    let media = media.unwrap();

    Ok(NamedFile::open(media.path.clone()).await?)
}

#[get("/media/<id>/page/<page>")]
pub async fn get_media_page(
    id: String,
    page: i32,
    ctx: &Context,
    auth: StumpAuth,
) -> ApiResult<ImageResponse> {
    let db = ctx.get_db();

    let book = db
        .media()
        .find_unique(media::id::equals(id.clone()))
        .with(media::read_progresses::fetch(vec![
            read_progress::user_id::equals(auth.0.id),
        ]))
        .exec()
        .await?;

    match book {
        Some(book) => {
            if page > book.pages {
                // FIXME: probably won't work lol
                Err(ApiError::Redirect(format!(
                    "/book/{}/read?page={}",
                    id, book.pages
                )))
            } else {
                Ok(fs::media_file::get_page(&book.path, page)?)
            }
        }
        None => Err(ApiError::NotFound(format!(
            "Media with id {} not found",
            id
        ))),
    }
}

#[get("/media/<id>/thumbnail")]
pub async fn get_media_thumbnail(
    id: String,
    ctx: &Context,
    auth: StumpAuth,
) -> ApiResult<ImageResponse> {
    let db = ctx.get_db();

    let book = db
        .media()
        .find_unique(media::id::equals(id.clone()))
        .with(media::read_progresses::fetch(vec![
            read_progress::user_id::equals(auth.0.id),
        ]))
        .exec()
        .await?;

    match book {
        Some(book) => Ok(fs::media_file::get_page(&book.path, 1)?),
        None => Err(ApiError::NotFound(format!(
            "Media with id {} not found",
            id
        ))),
    }
}

#[derive(Deserialize)]
pub struct UpdateProgress {
    page: i32,
}

// FIXME: this doesn't really handle certain errors correctly
#[put("/media/<id>/progress", data = "<progress>")]
pub async fn update_media_progress(
    id: String,
    progress: Json<UpdateProgress>,
    ctx: &Context,
    auth: StumpAuth,
) -> ApiResult<Json<read_progress::Data>> {
    let db = ctx.get_db();

    // update the progress, otherwise create it
    Ok(Json(
        db.read_progress()
            .upsert(read_progress::UniqueWhereParam::UserIdMediaIdEquals(
                auth.0.id.clone(),
                id.clone(),
            ))
            .create(
                read_progress::page::set(progress.page),
                read_progress::media::link(media::id::equals(id.clone())),
                read_progress::user::link(user::id::equals(auth.0.id.clone())),
                vec![],
            )
            .update(vec![read_progress::page::set(progress.page)])
            .exec()
            .await?,
    ))
}
