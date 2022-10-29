use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	utils::get_session_user,
};
use axum::{extract::Path, routing::get, Extension, Json, Router};
use axum_sessions::extractors::ReadableSession;
use stump_core::{
	db::models::ReadingList,
	prelude::CreateReadingList,
	prisma::{media, reading_list, user},
};
use tracing::log::trace;

pub(crate) fn mount() -> Router {
	Router::new()
		.route(
			"/reading-list",
			get(get_reading_list).post(create_reading_list),
		)
		.nest(
			"/reading-list/:id",
			Router::new().route(
				"/",
				get(get_reading_list_by_id)
					.put(update_reading_list)
					.delete(delete_reading_list_by_id),
			),
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
			.find_many(vec![reading_list::creating_user_id::equals(user_id)])
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
	let user_id = get_session_user(&session)?.id;

	let created_reading_list = db
		.reading_list()
		.create(
			input.id.to_owned(),
			user::id::equals(user_id.clone()),
			vec![reading_list::media::connect(
				input
					.media_ids
					.iter()
					.map(|id| media::id::equals(id.to_string()))
					.collect(),
			)],
		)
		.exec()
		.await?;

	Ok(Json(created_reading_list.into()))
}

async fn get_reading_list_by_id(
	Path(id): Path<String>,
	Extension(ctx): State,
	session: ReadableSession,
) -> ApiResult<Json<ReadingList>> {
	let _user_id = get_session_user(&session)?.id;
	let db = ctx.get_db();

	let reading_list_id = db
		.reading_list()
		.find_unique(reading_list::id::equals(id.clone()))
		.exec()
		.await?;

	if reading_list_id.is_none() {
		return Err(ApiError::NotFound(format!(
			"Reading List with id {} not found",
			id
		)));
	}

	// TODO: access control for reading lists...

	Ok(Json(reading_list_id.unwrap().into()))
}

async fn update_reading_list(
	Path(id): Path<String>,
	Extension(ctx): State,
	Json(input): Json<CreateReadingList>,
) -> ApiResult<Json<ReadingList>> {
	let db = ctx.get_db();

	let created_reading_list: _ = db
		.reading_list()
		.update(
			reading_list::id::equals(id.clone()),
			vec![reading_list::media::connect(
				input
					.media_ids
					.iter()
					.map(|id| media::id::equals(id.to_string()))
					.collect(),
			)],
		)
		.exec()
		.await?;

	Ok(Json(created_reading_list.into()))
}

async fn delete_reading_list_by_id(
	Path(id): Path<String>,
	Extension(ctx): State,
) -> ApiResult<Json<String>> {
	let db = ctx.get_db();

	trace!("Attempting to delete reading list with ID {}", &id);

	let deleted = db
		.reading_list()
		.delete(reading_list::id::equals(id.clone()))
		.exec()
		.await?;

	Ok(Json(deleted.id))
}
