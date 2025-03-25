use crate::{data::CoreContext, object::tag::Tag};
use async_graphql::{Context, Object, Result};
use models::entity::tag;
use sea_orm::prelude::*;

#[derive(Default)]
pub struct TagQuery;

#[Object]
impl TagQuery {
	/// Returns a list of all tags.
	async fn tags(&self, ctx: &Context<'_>) -> Result<Vec<Tag>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let query = tag::Entity::find()
			.into_model::<tag::Model>()
			.all(conn)
			.await?;

		Ok(query.into_iter().map(Tag::from).collect())
	}
}
