use async_graphql::{Context, Object, Result, ID};
use models::{entity::user, shared::enums::UserPermission};
use sea_orm::prelude::*;

use crate::{
	data::{CoreContext, RequestContext},
	guard::{PermissionGuard, SelfGuard, ServerOwnerGuard},
	object::user::User,
};

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

	#[graphql(
		guard = "PermissionGuard::one(UserPermission::ReadUsers).or(ServerOwnerGuard)"
	)]
	async fn users(&self, ctx: &Context<'_>) -> Result<Vec<User>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let users = user::Entity::find().all(conn).await?;

		Ok(users.into_iter().map(User::from).collect())
	}

	#[graphql(
		guard = "SelfGuard::new(&id).or(PermissionGuard::one(UserPermission::ReadUsers)).or(ServerOwnerGuard)"
	)]
	async fn user_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<User> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let first = user::Entity::find()
			.filter(user::Column::Id.eq(id.to_string()))
			.one(conn)
			.await?
			.unwrap();

		Ok(User::from(first))
	}
}
