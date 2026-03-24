use crate::{
	data::CoreContext,
	guard::PermissionGuard,
	input::scheduled_job_config::{
		validate_create_input, validate_cron_expression, CreateScheduledJobInput,
		ScheduledJobConfigInput, UpdateScheduledJobInput,
	},
	object::job_schedule_config::ScheduledJob,
};
use async_graphql::{Context, Object, Result};
use models::{
	entity::scheduled_job,
	shared::enums::{ScheduledJobKind, UserPermission},
};
use sea_orm::{prelude::*, ActiveModelTrait, Set};

#[derive(Default)]
pub struct ScheduledJobConfigMutation;

fn kind_from_config(config: &ScheduledJobConfigInput) -> ScheduledJobKind {
	match config {
		ScheduledJobConfigInput::LibraryScan(_) => ScheduledJobKind::LibraryScan,
		ScheduledJobConfigInput::MetadataRetry(_) => ScheduledJobKind::MetadataRetry,
	}
}

#[Object]
impl ScheduledJobConfigMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn create_scheduled_job(
		&self,
		ctx: &Context<'_>,
		input: CreateScheduledJobInput,
	) -> Result<ScheduledJob> {
		let core = ctx.data::<CoreContext>()?;

		validate_create_input(&input).map_err(async_graphql::Error::new)?;

		let kind = kind_from_config(&input.config);
		let config_json = serde_json::to_value(&input.config)?;

		let model = scheduled_job::ActiveModel {
			name: Set(input.name),
			kind: Set(kind),
			schedule: Set(input.schedule),
			config: Set(Some(config_json)),
			enabled: Set(input.enabled.unwrap_or(true)),
			..Default::default()
		}
		.insert(core.conn.as_ref())
		.await?;

		Ok(ScheduledJob::from(model))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn update_scheduled_job(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: UpdateScheduledJobInput,
	) -> Result<ScheduledJob> {
		let core = ctx.data::<CoreContext>()?;

		let existing = scheduled_job::Entity::find_by_id(id)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Scheduled job not found")?;

		let mut active: scheduled_job::ActiveModel = existing.into();

		if let Some(name) = input.name {
			active.name = Set(name);
		}

		if let Some(schedule) = input.schedule {
			validate_cron_expression(&schedule).map_err(async_graphql::Error::new)?;
			active.schedule = Set(schedule);
		}

		if let Some(ref config) = input.config {
			let kind = kind_from_config(config);
			let config_json = serde_json::to_value(config)?;
			active.kind = Set(kind);
			active.config = Set(Some(config_json));
		}

		if let Some(enabled) = input.enabled {
			active.enabled = Set(enabled);
		}

		let updated = active.update(core.conn.as_ref()).await?;

		Ok(ScheduledJob::from(updated))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn delete_scheduled_job(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
		let core = ctx.data::<CoreContext>()?;

		let deleted_count = scheduled_job::Entity::delete_many()
			.filter(scheduled_job::Column::Id.eq(id))
			.exec(core.conn.as_ref())
			.await?
			.rows_affected;

		if deleted_count == 0 {
			tracing::warn!(?id, "No scheduled job to delete with the given ID");
		}

		Ok(deleted_count > 0)
	}
}
