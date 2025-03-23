use async_graphql::{Context, Object, Result};
use graphql::{
	data::{CoreContext, RequestContext},
	object::user::User,
};
use models::entity::user;
use sea_orm::prelude::*;

#[derive(Default)]
pub struct UserQuery;

#[Object]
impl UserQuery {
	async fn me(&self, ctx: &Context<'_>) -> Result<User> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let first = user::Entity::find()
			.filter(user::Column::Id.eq(user.id.clone()))
			.one(conn)
			.await?
			.unwrap();

		Ok(User::from(first))
	}
}
