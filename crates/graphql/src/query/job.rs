use crate::guard::PermissionGuard;
use crate::{data::CoreContext, object::job::Job};
use async_graphql::{Context, Object, Result, ID};
use models::{entity::job, shared::enums::UserPermission};
use sea_orm::prelude::*;

#[derive(Default)]
pub struct JobQuery;

#[Object]
impl JobQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadJobs)")]
	async fn jobs(&self, ctx: &Context<'_>) -> Result<Vec<Job>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		Ok(job::Entity::find()
			.all(conn)
			.await?
			.into_iter()
			.map(Job::from)
			.collect())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadJobs)")]
	async fn job_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Job>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let job = job::Entity::find_by_id(id.0).one(conn).await?;
		Ok(job.map(Job::from))
	}
}
