use rocket::serde::json::Json;
use rocket_okapi::{openapi, JsonSchema};
use serde::Deserialize;

use crate::{
	guards::auth::Auth,
	prisma::tag,
	types::{
		alias::{ApiResult, Context},
		models::tag::Tag,
	},
};

/// Get all tags for all items in the database. Tags are returned in a flat list,
/// not grouped by the items which they belong to.
#[openapi(tag = "Tag")]
#[get("/tags")]
pub async fn get_tags(ctx: &Context, _auth: Auth) -> ApiResult<Json<Vec<Tag>>> {
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

#[derive(Deserialize, JsonSchema)]
pub struct CreateTags {
	pub tags: Vec<String>,
}

#[openapi(tag = "Tag")]
#[post("/tags", format = "application/json", data = "<input>")]
pub async fn create_tags(
	input: Json<CreateTags>,
	ctx: &Context,
	// _auth: Auth,
) -> ApiResult<Json<Vec<Tag>>> {
	let db = ctx.get_db();

	let tags = input.tags.to_owned();

	let mut created_tags = vec![];

	// FIXME: bulk insert not yet supported. Also transactions, as an alternative,
	// not yet supported.
	for tag in tags {
		match db.tag().create(tag::name::set(tag), vec![]).exec().await {
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
