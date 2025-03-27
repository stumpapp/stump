use crate::guard::PermissionGuard;
use crate::{data::CoreContext, object::emailer::Emailer};
use async_graphql::{Context, Object, Result, ID};
use models::{entity::emailer, shared::enums::UserPermission};
use sea_orm::prelude::*;

// TODO(graphql): Mutations

#[derive(Default)]
pub struct EmailerQuery;

#[Object]
impl EmailerQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerRead)")]
	async fn emailers(&self, ctx: &Context<'_>) -> Result<Vec<Emailer>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		Ok(emailer::Entity::find()
			.all(conn)
			.await?
			.into_iter()
			.map(Emailer::from)
			.collect())
	}

	// TODO(graphql): Determine best practice for return (error vs Option)
	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerRead)")]
	async fn emailer_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Emailer>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let id: i32 = id.0.parse()?;
		let emailer = emailer::Entity::find_by_id(id).one(conn).await?;
		Ok(emailer.map(Emailer::from))
	}
}
