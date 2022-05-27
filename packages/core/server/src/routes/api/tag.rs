use rocket::serde::json::Json;
use serde::Deserialize;

use crate::{
	guards::auth::Auth,
	prisma::tag,
	types::alias::{ApiResult, Context},
};

/// Get all tags for all items in the database. Tags are returned in a flat list,
/// not grouped by the items which they belong to.
#[get("/tags")]
pub async fn get_tags(ctx: &Context, _auth: Auth) -> ApiResult<Json<Vec<tag::Data>>> {
	let db = ctx.get_db();

	Ok(Json(db.tag().find_many(vec![]).exec().await?))
}

#[derive(Deserialize)]
pub struct CreateTag {
	name: String,
}

pub type CreateTags = Vec<CreateTag>;

#[post("/tags", format = "application/json", data = "<tags>")]
pub async fn create_tags(
	tags: Json<CreateTags>,
	ctx: &Context,
	_auth: Auth,
) -> ApiResult<Json<Vec<tag::Data>>> {
	let db = ctx.get_db();

	let tags = tags.into_inner();

	let mut created_tags = vec![];

	// FIXME: bulk insert not yet supported. Also transactions, as an alternative,
	// not yet supported.
	for tag in tags {
		match db
			.tag()
			.create(tag::name::set(tag.name), vec![])
			.exec()
			.await
		{
			Ok(new_tag) => {
				created_tags.push(new_tag);
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
