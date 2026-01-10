use crate::{
	data::CoreContext,
	guard::PermissionGuard,
	input::scheduled_job_config::{ScheduledJobConfigInput, ScheduledJobConfigValidator},
	object::job_schedule_config::ScheduledJobConfig,
};
use async_graphql::{Context, Object, Result};
use models::{
	entity::{scheduled_job_config, scheduled_job_library},
	shared::enums::UserPermission,
};
use sea_orm::{prelude::*, ActiveModelTrait, Set, TransactionTrait};

#[derive(Default)]
pub struct ScheduledJobConfigMutation;

#[Object]
impl ScheduledJobConfigMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn create_scheduled_job_config(
		&self,
		ctx: &Context<'_>,
		#[graphql(validator(custom = "ScheduledJobConfigValidator"))]
		input: ScheduledJobConfigInput,
	) -> Result<ScheduledJobConfig> {
		let core = ctx.data::<CoreContext>()?;

		let created_model = scheduled_job_config::ActiveModel {
			interval_secs: Set(input.interval_secs),
			..Default::default()
		}
		.insert(core.conn.as_ref())
		.await?;

		let joint_active_models = input
			.included_library_ids
			.iter()
			.map(|library_id| scheduled_job_library::ActiveModel {
				library_id: Set(library_id.clone()),
				schedule_id: Set(created_model.id),
				..Default::default()
			})
			.collect::<Vec<_>>();
		dbg!(&joint_active_models);

		let created_joint_records =
			scheduled_job_library::Entity::insert_many(joint_active_models)
				.exec_without_returning(core.conn.as_ref())
				.await?;
		dbg!(created_joint_records);

		Ok(ScheduledJobConfig::from(created_model))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn update_scheduled_job_config(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: ScheduledJobConfigInput,
	) -> Result<ScheduledJobConfig> {
		let core = ctx.data::<CoreContext>()?;

		let (model, libraries) = scheduled_job_config::Entity::find()
			.filter(scheduled_job_config::Column::Id.eq(id))
			.find_with_linked(scheduled_job_library::ScheduledJobConfigsToLibraries)
			.all(core.conn.as_ref())
			.await?
			.pop()
			.ok_or("Scheduled job config not found")?;

		let mut active_model: scheduled_job_config::ActiveModel = model.into();
		active_model.interval_secs = Set(input.interval_secs);

		let ids_to_remove = libraries
			.iter()
			.filter(|library| !input.included_library_ids.contains(&library.id))
			.map(|library| library.id.clone())
			.collect::<Vec<_>>();

		let ids_to_add = input
			.included_library_ids
			.iter()
			.filter(|id| !libraries.iter().any(|lib| lib.id == **id))
			.cloned()
			.collect::<Vec<_>>();

		let txn = core.conn.begin().await?;

		let updated_model = active_model.update(&txn).await?;

		// Remove libraries that are no longer included
		if !ids_to_remove.is_empty() {
			scheduled_job_library::Entity::delete_many()
				.filter(scheduled_job_library::Column::LibraryId.is_in(ids_to_remove))
				.filter(scheduled_job_library::Column::ScheduleId.eq(id))
				.exec(&txn)
				.await?;
		}

		// Add new libraries that are included
		if !ids_to_add.is_empty() {
			let new_joints = ids_to_add.into_iter().map(|library_id| {
				scheduled_job_library::ActiveModel {
					library_id: Set(library_id),
					schedule_id: Set(updated_model.id),
					..Default::default()
				}
			});
			scheduled_job_library::Entity::insert_many(new_joints)
				.exec(&txn)
				.await?;
		}

		txn.commit().await?;

		Ok(ScheduledJobConfig::from(updated_model))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageServer)")]
	async fn delete_scheduled_job_config(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<bool> {
		let core = ctx.data::<CoreContext>()?;

		let deleted_count = scheduled_job_config::Entity::delete_many()
			.filter(scheduled_job_config::Column::Id.eq(id))
			.exec(core.conn.as_ref())
			.await?
			.rows_affected;

		if deleted_count == 0 {
			tracing::warn!(?id, "No scheduled job config to delete with the given ID");
		}

		Ok(deleted_count > 0)
	}
}
