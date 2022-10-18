use axum::{
	routing::{get, post, put, delete},
	Extension, Json, Router,
};
use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{
    prisma::{reading_list, media, user},
	types::{User, readinglist::ReadingList, Media, readinglist::CreateReadingList},
};
use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	utils::{get_session_user},
};

pub(crate) fn mount() -> Router {
    Router::new()
        .route("/reading-list", get(get_reading_list).post(create_reading_list))
        .nest(
            "/reading-list/:id",
            Router::new()
                .route("/", get(get_reading_list_by_id).put(update_reading_list).delete(delete_reading_list_by_id)),
        )
}

async fn get_reading_list(
    Extension(ctx): State,
	session: ReadableSession,
) -> ApiResult<Json<Vec<ReadingList>>> {
	let user_id = get_session_user(&session)?.id;

    Ok(Json(
        ctx.db
            .reading_list()
            .find_many(vec![
                reading_list::creating_user_id::equals(user_id),
            ])
			.exec()
			.await?
			.into_iter()
			.map(|u| u.into())
			.collect::<Vec<ReadingList>>(),
    ))
}

async fn create_reading_list(
    Extension(ctx): State,
	Json(input): Json<CreateReadingList>,
	session: ReadableSession,
) -> ApiResult<Json<ReadingList>> {
	let db = ctx.get_db();
    let username = get_session_user(&session)?;
	let user_id = get_session_user(&session)?.id;

    let created_reading_list = db
        .reading_list()
        .create(
            input.id.to_owned(),
            reading_list::creating_user::user::id::equals(user_id.clone()),
            vec![reading_list::media::connect(input.media_ids.iter().map(|id| media::id::equals(id.to_string())).collect())]
        )
        .exec()
        .await?;

    Ok(Json(created_reading_list.into()))
}

async fn get_reading_list_by_id() {
    todo!()
}

async fn update_reading_list() {
    todo!()
}

async fn delete_reading_list_by_id() {
    todo!()
}