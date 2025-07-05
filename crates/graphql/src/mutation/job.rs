use crate::{data::CoreContext, guard::PermissionGuard};
use async_graphql::{Context, Error, ErrorExtensions, Object, Result, ID};
use models::shared::enums::UserPermission;
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
	async fn delete_job(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		unimplemented!()
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageJobs)")]
	async fn delete_job_logs(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		unimplemented!()
	}
}
