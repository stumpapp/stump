use async_graphql::{Context, Object, Result, ID};
use models::{entity::user, entity::user_login_activity, shared::enums::UserPermission};
use sea_orm::{prelude::*, QueryOrder};

use crate::{
	data::{CoreContext, RequestContext},
	guard::{PermissionGuard, SelfGuard, ServerOwnerGuard},
	object::{user::User, user_login_activity::UserLoginActivity},
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

	#[graphql(guard = "ServerOwnerGuard")]
	async fn login_activity(&self, ctx: &Context<'_>) -> Result<Vec<UserLoginActivity>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let activities = user_login_activity::Entity::find()
			.order_by_desc(user_login_activity::Column::Timestamp)
			.all(conn)
			.await?;

		Ok(activities
			.into_iter()
			.map(UserLoginActivity::from)
			.collect())
	}

	#[graphql(guard = "SelfGuard::new(&id).or(ServerOwnerGuard)")]
	async fn login_activity_by_id(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Vec<UserLoginActivity>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let activities = user_login_activity::Entity::find()
			.filter(user_login_activity::Column::UserId.eq(id.to_string()))
			.order_by_desc(user_login_activity::Column::Timestamp)
			.all(conn)
			.await?;

		Ok(activities
			.into_iter()
			.map(UserLoginActivity::from)
			.collect())
	}
}
