use crate::{
	data::CoreContext, guard::PermissionGuard, input::notifier::NotifierInput,
	object::notifier::Notifier,
};
use async_graphql::{Context, Object, Result};
use models::entity::notifier;
use models::shared::enums::UserPermission;
use sea_orm::{prelude::*, ActiveModelTrait, Set};

#[derive(Default)]
pub struct NotifierMutation;

#[Object]
impl NotifierMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::CreateNotifier)")]
	async fn create_notifier(
		&self,
		ctx: &Context<'_>,
		input: NotifierInput,
	) -> Result<Notifier> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let active_model = input.try_into_active_model(&encryption_key)?;
		let result = active_model.insert(conn).await?;

		Ok(Notifier::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::ManageNotifier)")]
	async fn update_notifier(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: NotifierInput,
	) -> Result<Notifier> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();
		let encryption_key = core_ctx.get_encryption_key().await?;

		let mut active_model = input.try_into_active_model(&encryption_key)?;
		active_model.id = Set(id);
		let result = active_model.update(conn).await?;

		Ok(Notifier::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::DeleteNotifier)")]
	async fn delete_notifier(&self, ctx: &Context<'_>, id: i32) -> Result<Notifier> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let model = notifier::Entity::find_by_id(id)
			.one(conn)
			.await?
			.ok_or_else(|| async_graphql::Error::new("Notifier not found"))?;
		let _ = model.clone().delete(conn).await?;

		Ok(Notifier::from(model))
	}
}
