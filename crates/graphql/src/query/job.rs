use crate::guard::PermissionGuard;
use crate::object::job_schedule_config::ScheduledJobConfig;
use crate::pagination::{
	CursorPaginationInfo, OffsetPaginationInfo, PaginatedResponse, Pagination,
	PaginationValidator,
};
use crate::{data::CoreContext, object::job::Job};
use async_graphql::{Context, Object, Result, ID};
use models::entity::scheduled_job_config;
use models::{entity::job, shared::enums::UserPermission};
use sea_orm::{prelude::*, QueryOrder, QuerySelect};

#[derive(Default)]
pub struct JobQuery;

#[Object]
impl JobQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadJobs)")]
	async fn jobs(
		&self,
		ctx: &Context<'_>,
		#[graphql(default, validator(custom = "PaginationValidator"))]
		pagination: Pagination,
	) -> Result<PaginatedResponse<Job>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let query = job::Entity::find().order_by_desc(job::Column::CreatedAt);

		match pagination.resolve() {
			Pagination::Cursor(info) => {
				let mut cursor = query.cursor_by(job::Column::CreatedAt);
				if let Some(ref id) = info.after {
					let job = job::Entity::find()
						.select_only()
						.column(job::Column::Id)
						.column(job::Column::CreatedAt)
						.filter(job::Column::Id.eq(id.clone()))
						.into_model::<job::JobCreatedAtSelect>()
						.one(conn)
						.await?
						.ok_or("Cursor not found")?;
					cursor.after(job.created_at);
				}
				cursor.first(info.limit);

				let models = cursor.into_model::<job::Model>().all(conn).await?;
				let current_cursor = info
					.after
					.or_else(|| models.first().map(|result| result.id.clone()));
				let next_cursor = match models.last().map(|result| result.id.clone()) {
					Some(id) if models.len() == info.limit as usize => Some(id),
					_ => None,
				};

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Job::from).collect(),
					page_info: CursorPaginationInfo {
						current_cursor,
						next_cursor,
						limit: info.limit,
					}
					.into(),
				})
			},
			Pagination::Offset(info) => {
				let count = query.clone().count(conn).await?;

				let models = query
					.offset(info.offset())
					.limit(info.limit())
					.all(conn)
					.await?;

				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Job::from).collect(),
					page_info: OffsetPaginationInfo::new(info, count).into(),
				})
			},
			Pagination::None(_) => {
				let models = query.all(conn).await?;
				let count = models.len().try_into()?;
				Ok(PaginatedResponse {
					nodes: models.into_iter().map(Job::from).collect(),
					page_info: OffsetPaginationInfo::unpaged(count).into(),
				})
			},
		}
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadJobs)")]
	async fn job_by_id(&self, ctx: &Context<'_>, id: ID) -> Result<Option<Job>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let job = job::Entity::find_by_id(id.to_string()).one(conn).await?;
		Ok(job.map(Job::from))
	}

	// TODO(permissions): Determine if folks generally agree with this access
	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadJobs)")]
	async fn scheduled_job_configs(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<ScheduledJobConfig>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let models = scheduled_job_config::Entity::find().all(conn).await?;

		Ok(models.into_iter().map(ScheduledJobConfig::from).collect())
	}
}
