use axum::{middleware::from_extractor, routing::get, Extension, Json, Router};
use serde::Deserialize;
use stump_core::db::models::Tag;

use crate::{config::state::State, errors::ApiResult, middleware::auth::Auth};

pub(crate) fn mount() -> Router {
	Router::new()
		.route("/tags", get(get_tags).post(create_tags))
		.layer(from_extractor::<Auth>())
}

/// Get all tags for all items in the database. Tags are returned in a flat list,
/// not grouped by the items which they belong to.
async fn get_tags(Extension(ctx): State) -> ApiResult<Json<Vec<Tag>>> {
	let db = ctx.get_db();

	Ok(Json(
		db.tag()
			.find_many(vec![])
			.exec()
			.await?
			.into_iter()
			.map(|t| t.into())
			.collect(),
	))
}

#[derive(Deserialize)]
pub struct CreateTags {
	pub tags: Vec<String>,
}

async fn create_tags(
	Json(input): Json<CreateTags>,
	Extension(ctx): State,
) -> ApiResult<Json<Vec<Tag>>> {
	let db = ctx.get_db();

	let tags = input.tags.to_owned();

	let mut created_tags = vec![];

	// FIXME: bulk insert not yet supported. Also transactions, as an alternative,
	// not yet supported.
	for tag in tags {
		match db.tag().create(tag, vec![]).exec().await {
			Ok(new_tag) => {
				created_tags.push(new_tag.into());
			},
			Err(e) => {
				// TODO: check if duplicate tag error, in which case I don't care and
				// will ignore the error, otherwise throw the error.
				// Alternative, I could upsert? This way an error is always an error,
				// and if there's a duplicate tag it will be "updated", but really nothing
				// will happen sine the name is the same?
				println!("{}", e);
			},
		}
	}

	Ok(Json(created_tags))
}
