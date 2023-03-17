use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	utils::get_session_user,
};
use axum::{
	extract::{Path, State},
	routing::get,
	Json, Router,
};
use axum_sessions::extractors::ReadableSession;
use stump_core::{
	db::models::ReadingList,
	prelude::CreateReadingList,
	prisma::{media, reading_list, user},
};
use tracing::log::trace;

pub(crate) fn mount() -> Router<AppState> {
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

#[utoipa::path(
	get,
	path = "/api/v1/reading-list",
	tag = "reading-list",
	responses(
		(status = 200, description = "Successfully fetched reading lists.", body = [ReadingList]),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
// TODO: pagination
/// Fetches all reading lists for the current user.
async fn get_reading_list(
	State(ctx): State<AppState>,
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

#[utoipa::path(
	post,
	path = "/api/v1/reading-list",
	tag = "reading-list",
	request_body = CreateReadingList,
	responses(
		(status = 200, description = "Successfully created reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn create_reading_list(
	State(ctx): State<AppState>,
	session: ReadableSession,
	Json(input): Json<CreateReadingList>,
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

#[utoipa::path(
	get,
	path = "/api/v1/reading-list/:id",
	tag = "reading-list",
	params(
		("id" = String, Path, description = "The ID of the reading list to fetch.")
	),
	responses(
		(status = 200, description = "Successfully fetched reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 404, description = "Reading list not found."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_reading_list_by_id(
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	session: ReadableSession,
) -> ApiResult<Json<ReadingList>> {
	let _user_id = get_session_user(&session)?.id;
	let db = ctx.get_db();

	let reading_list = db
		.reading_list()
		.find_unique(reading_list::id::equals(id.clone()))
		.exec()
		.await?;

	if reading_list.is_none() {
		return Err(ApiError::NotFound(format!(
			"Reading List with id {} not found",
			id
		)));
	}

	// TODO: access control for reading lists...
	Ok(Json(reading_list.unwrap().into()))
}

// TODO: fix this endpoint, way too naive of an update...
#[utoipa::path(
	put,
	path = "/api/v1/reading-list/:id",
	tag = "reading-list",
	params(
		("id" = String, Path, description = "The ID of the reading list to update.")
	),
	request_body = CreateReadingList,
	responses(
		(status = 200, description = "Successfully updated reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Reading list not found."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn update_reading_list(
	session: ReadableSession,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
	Json(input): Json<CreateReadingList>,
) -> ApiResult<Json<ReadingList>> {
	let user = get_session_user(&session)?;
	let db = ctx.get_db();

	let reading_list = db
		.reading_list()
		.find_unique(reading_list::id::equals(id.clone()))
		.exec()
		.await?;

	if reading_list.is_none() {
		return Err(ApiError::NotFound(format!(
			"Reading List with id {} not found",
			id
		)));
	}

	let reading_list = reading_list.unwrap();
	if reading_list.creating_user_id != user.id {
		// TODO: log bad access attempt to DB
		return Err(ApiError::Forbidden(String::from(
			"You do not have permission to access this resource.",
		)));
	}

	let created_reading_list = db
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

#[utoipa::path(
	delete,
	path = "/api/v1/reading-list/:id",
	tag = "reading-list",
	params(
		("id" = String, Path, description = "The ID of the reading list to delete.")
	),
	responses(
		(status = 200, description = "Successfully deleted reading list.", body = ReadingList),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 404, description = "Reading list not found."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn delete_reading_list_by_id(
	session: ReadableSession,
	Path(id): Path<String>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<ReadingList>> {
	let user = get_session_user(&session)?;
	let db = ctx.get_db();

	let reading_list = db
		.reading_list()
		.find_unique(reading_list::id::equals(id.clone()))
		.exec()
		.await?;

	if reading_list.is_none() {
		return Err(ApiError::NotFound(format!(
			"Reading List with id {} not found",
			id
		)));
	}

	let reading_list = reading_list.unwrap();
	if reading_list.creating_user_id != user.id {
		// TODO: log bad access attempt to DB
		return Err(ApiError::forbidden_discreet());
	}

	trace!("Attempting to delete reading list with ID {}", &id);
	let deleted = db
		.reading_list()
		.delete(reading_list::id::equals(id.clone()))
		.exec()
		.await?;

	Ok(Json(deleted.into()))
}
