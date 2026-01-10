use crate::data::CoreContext;
use crate::guard::PermissionGuard;
use crate::object::email_device::RegisteredEmailDevice;
use async_graphql::{Context, Object, Result};
use models::{entity::registered_email_device, shared::enums::UserPermission};
use sea_orm::prelude::*;

#[derive(Default)]
pub struct EmailDeviceQuery;

#[Object]
impl EmailDeviceQuery {
	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailSend)")]
	async fn email_devices(
		&self,
		ctx: &Context<'_>,
	) -> Result<Vec<RegisteredEmailDevice>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		Ok(registered_email_device::Entity::find()
			.all(conn)
			.await?
			.into_iter()
			.map(RegisteredEmailDevice::from)
			.collect())
	}

	#[graphql(guard = "PermissionGuard::one(UserPermission::EmailSend)")]
	async fn email_device_by_id(
		&self,
		ctx: &Context<'_>,
		id: i32,
	) -> Result<Option<RegisteredEmailDevice>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let email_device = registered_email_device::Entity::find_by_id(id)
			.one(conn)
			.await?;
		Ok(email_device.map(RegisteredEmailDevice::from))
	}
}
