use crate::{
	data::CoreContext,
	guard::PermissionGuard,
	object::job::{DeleteJobAssociatedLogs, DeleteJobHistory},
};
use async_graphql::{Context, Error, ErrorExtensions, Object, Result, ID};
use models::{
	entity::{job, log},
	shared::enums::{JobStatus, UserPermission},
};
use sea_orm::{prelude::*, EntityTrait, QueryFilter, QuerySelect};
use stump_core::job::{AcknowledgeableCommand, JobControllerCommand};
use tokio::sync::oneshot;

#[derive(Default)]
pub struct JobMutation;

#[Object]
impl JobMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageJobs)")]
	async fn cancel_job(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let (task_tx, task_rx) = oneshot::channel();

		let core = ctx.data::<CoreContext>()?;
		if let Err(error) = core.send_job_controller_command(
			JobControllerCommand::CancelJob(AcknowledgeableCommand {
				id: id.to_string(),
				ack: task_tx,
			}),
		) {
			tracing::error!(?error, "Failed to send cancel job command");
			return Err(Error::new("Failed to send cancel job command").extend_with(
				|_, e| {
					e.set("error", error.to_string());
				},
			));
		}

		match task_rx.await {
			Ok(ack) => match ack {
				Ok(_) => Ok(true),
				Err(error) => {
					tracing::error!(?error, "Failed to cancel job");
					Err(Error::new("Failed to cancel job").extend_with(|_, e| {
						e.set("error", error.to_string());
					}))
				},
			},
			Err(error) => {
				tracing::error!(?error, "Failed to receive cancel job confirmation");
				Err(
					Error::new("Failed to receive cancel job confirmation").extend_with(
						|_, e| {
							e.set("error", error.to_string());
						},
					),
				)
			},
		}
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageJobs)")]
	async fn delete_job(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default)] force: bool,
	) -> Result<bool> {
		let core = ctx.data::<CoreContext>()?;

		let job = job::Entity::find_by_id(id.to_string())
			.select_only()
			.columns([job::Column::Id, job::Column::Status])
			.into_model::<job::JobStatusSelect>()
			.one(core.conn.as_ref())
			.await?
			.ok_or_else(|| {
				Error::new("Job not found").extend_with(|_, e| {
					e.set("id", id.to_string());
				})
			})?;

		if job.status.is_resolved() || force {
			job::Entity::delete_by_id(id.to_string())
				.exec(core.conn.as_ref())
				.await?;
			return Ok(true);
		}

		tracing::warn!(
			?id,
			"Job is not resolved, attempting to cancel before deletion"
		);

		if let Err(error) = JobMutation::cancel_job(self, ctx, id.clone()).await {
			tracing::error!(?error, "Failed to cancel job before deletion");
			return Err(Error::new("Failed to cancel job before deletion"));
		}

		job::Entity::delete_by_id(id.to_string())
			.exec(core.conn.as_ref())
			.await?;

		Ok(true)
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageJobs)")]
	async fn delete_job_history(&self, ctx: &Context<'_>) -> Result<DeleteJobHistory> {
		let core = ctx.data::<CoreContext>()?;

		let affected_rows = job::Entity::delete_many()
			.filter(job::Column::Status.ne(JobStatus::Running))
			.exec(core.conn.as_ref())
			.await
			.map_err(|error| {
				tracing::error!(?error, "Failed to delete job history");
				Error::new("Failed to delete job history").extend_with(|_, e| {
					e.set("error", error.to_string());
				})
			})?
			.rows_affected;

		tracing::debug!(affected_rows, "Deleted job history",);

		Ok(DeleteJobHistory { affected_rows })
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageJobs)")]
	async fn delete_job_logs(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<DeleteJobAssociatedLogs> {
		let core = ctx.data::<CoreContext>()?;

		let affected_rows = log::Entity::delete_many()
			.filter(log::Column::JobId.eq(id.to_string()))
			.exec(core.conn.as_ref())
			.await
			.map_err(|err| {
				Error::new("Failed to delete job logs").extend_with(|_, e| {
					e.set("error", err.to_string());
				})
			})?
			.rows_affected;

		Ok(DeleteJobAssociatedLogs { affected_rows })
	}
}
