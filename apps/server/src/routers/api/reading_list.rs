use axum::{
	routing::{get, post},
	Extension, Json, Router,
};
use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{
    prisma::{reading_list, media, user},
	types::{User, ReadingList},
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
	let user = get_session_user(&session)?;

    if user != user.reading_lists.creating_user {
        return Err(ApiError::Forbidden(
			"You do not have permission to access this resource.".into(),
		));
    }

    Ok(Json(
        ctx.db
            .reading_list()
            .find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(|u| u.into())
			.collect::<Vec<ReadingList>>(),
    ))
}

async fn create_reading_list() {
    todo!()
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