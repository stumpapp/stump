use async_graphql::{Context, Object, Result};
use graphql::{
	data::{CoreContext, RequestContext},
	object::reading_list::ReadingList,
};
use models::entity::reading_list;
use sea_orm::prelude::*;

#[derive(Default)]
pub struct ReadingListQuery;

#[Object]
impl ReadingListQuery {
	async fn reading_list(&self, ctx: &Context<'_>) -> Result<Vec<ReadingList>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		// TODO: add RBAC controls
		// TODO: add pagination

		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let first = reading_list::Entity::find().one(conn).await?;

		if first.is_none() {
			return Ok(vec![]);
		}

		Ok(vec![ReadingList::from(first.unwrap())])
	}

	// create reading list

	// get reading list by id

	// update reading list

	// delete reading list
}
