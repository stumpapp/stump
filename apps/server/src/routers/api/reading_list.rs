use axum::{
	routing::{get, post},
	Extension, Json, Router,
};
use axum_sessions::extractors::{ReadableSession, WritableSession};
use stump_core::{
    prisma::{reading_list, media}
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

async fn get_reading_list() {
    todo!()
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