use axum::{
	extract::State, middleware::from_extractor_with_state, routing::get, Json, Router,
};
use stump_core::{
	db::entity::{CreateTags, Tag},
	prisma::tag,
};
use tracing::error;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	middleware::auth::Auth,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/tags", get(get_tags).post(create_tags))
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

#[utoipa::path(
	get,
	path = "/api/v1/tags",
	tag = "tag",
	responses(
		(status = 200, description = "Successfully fetched tags.", body = [Tag]),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all tags for all items in the database. Tags are returned in a flat list,
/// not grouped by the items which they belong to.
async fn get_tags(State(ctx): State<AppState>) -> APIResult<Json<Vec<Tag>>> {
	let db = &ctx.db;

	Ok(Json(
		db.tag()
			.find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(Tag::from)
			.collect(),
	))
}

#[utoipa::path(
	post,
	path = "/api/v1/tags",
	tag = "tag",
	request_body = CreateTags,
	responses(
		(status = 200, description = "Successfully created tags.", body = [Tag]),
		(status = 401, description = "Unauthorized."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Create new tags. If any of the tags already exist, an error is returned.
async fn create_tags(
	State(ctx): State<AppState>,
	Json(input): Json<CreateTags>,
) -> APIResult<Json<Vec<Tag>>> {
	let db = &ctx.db;

	let already_existing_tags = db
		.tag()
		.find_many(vec![tag::name::in_vec(input.tags.clone())])
		.exec()
		.await?;

	if !already_existing_tags.is_empty() {
		error!(existing_tags = ?already_existing_tags, "Tags already exist");

		let existing_names = already_existing_tags
			.into_iter()
			.map(|t| t.name)
			.collect::<Vec<String>>()
			.join(", ");

		return Err(APIError::BadRequest(format!(
			"Attempted to create tags which already exist: {}",
			existing_names
		)));
	}

	let create_tags = input
		.tags
		.into_iter()
		.map(|value| db.tag().create(value, vec![]))
		.collect::<Vec<_>>();
	let created_tags = db._batch(create_tags).await?;

	Ok(Json(created_tags.into_iter().map(Tag::from).collect()))
}
