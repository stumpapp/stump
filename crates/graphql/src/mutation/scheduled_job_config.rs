use crate::{
	data::CoreContext, guard::PermissionGuard,
	input::scheduled_job_config::ScheduledJobConfigInput,
	object::job_schedule_config::ScheduledJobConfig,
};
use async_graphql::{Context, Object, Result};
use models::shared::enums::UserPermission;
use sea_orm::{prelude::*, ActiveModelTrait, Set};

#[derive(Default)]
pub struct ScheduledJobConfigMutation;

#[Object]
impl ScheduledJobConfigMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn update_scheduled_job_config(
		&self,
		ctx: &Context<'_>,
		input: ScheduledJobConfigInput,
	) -> Result<ScheduledJobConfig> {
		let core = ctx.data::<CoreContext>()?;
		todo!();
	}
}
