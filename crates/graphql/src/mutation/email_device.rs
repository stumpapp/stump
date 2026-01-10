use crate::{
	data::CoreContext,
	guard::PermissionGuard,
	input::email_device::{EmailDeviceInput, PatchEmailDeviceInput},
	object::email_device::RegisteredEmailDevice,
};
use async_graphql::{Context, Object, Result};
use models::{entity::registered_email_device, shared::enums::UserPermission};
use sea_orm::{prelude::*, Set, TryIntoModel};

#[derive(Default)]
pub struct EmailDeviceMutation;

#[Object]
impl EmailDeviceMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerManage)")]
	async fn create_email_device(
		&self,
		ctx: &Context<'_>,
		input: EmailDeviceInput,
	) -> Result<RegisteredEmailDevice> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let email_device = input.into_active_model();
		let result = email_device.save(conn).await?.try_into_model()?;

		Ok(RegisteredEmailDevice::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerManage)")]
	async fn update_email_device(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: EmailDeviceInput,
	) -> Result<RegisteredEmailDevice> {
		let core_ctx = ctx.data::<CoreContext>()?;
		let conn = core_ctx.conn.as_ref();

		let mut email_device = input.into_active_model();
		email_device.id = Set(id);
		let result = email_device.save(conn).await?.try_into_model()?;

		Ok(RegisteredEmailDevice::from(result))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerManage)")]
	async fn patch_email_device(
		&self,
		ctx: &Context<'_>,
		id: i32,
		input: PatchEmailDeviceInput,
	) -> Result<RegisteredEmailDevice> {
		let core_ctx = ctx.data::<CoreContext>()?;

		let device = registered_email_device::Entity::find_by_id(id)
			.one(core_ctx.conn.as_ref())
			.await?
			.ok_or("Email device not found")?;

		let patched_device = input.apply(device).update(core_ctx.conn.as_ref()).await?;

		Ok(RegisteredEmailDevice::from(patched_device))
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailerManage)")]
	async fn delete_email_device(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<RegisteredEmailDevice> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = registered_email_device::Entity::delete_by_id(id)
			.exec_with_returning(conn)
			.await?
			.first()
			.ok_or("Failed to delete email device".to_string())?
			.clone();

		Ok(RegisteredEmailDevice::from(model))
	}
}
