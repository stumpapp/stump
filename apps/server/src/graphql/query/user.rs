use async_graphql::{Context, Object, Result};
use graphql::{data::CoreContext, object::user::User};
use models::entity::user;
use sea_orm::prelude::*;

#[derive(Default)]
pub struct UserQuery;

#[Object]
impl UserQuery {
	async fn me(&self, ctx: &Context<'_>) -> Result<User> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let first = user::Entity::find()
			.filter(user::Column::Username.eq("oromei"))
			.one(conn)
			.await?
			.unwrap();

		Ok(User::from(first))
	}
}
