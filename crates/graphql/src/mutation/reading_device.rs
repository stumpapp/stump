use async_graphql::{Context, Object, Result};
use models::entity::reading_device;
use sea_orm::{prelude::*, sea_query::OnConflict, ActiveValue::Set, IntoActiveModel};

use crate::data::{AuthContext, CoreContext};

/// A mutation root for reading devices
#[derive(Default)]
pub struct ReadingDeviceMutation;

#[Object]
impl ReadingDeviceMutation {
	/// Upserts a reading device for the authenticated user
	async fn upsert_reading_device(
		&self,
		ctx: &Context<'_>,
		id: String,
		name: String,
	) -> Result<reading_device::Model> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let entry = reading_device::ActiveModel {
			id: Set(id),
			name: Set(name),
			user_id: Set(user.id.clone()),
			..Default::default()
		};

		let upserted_entry = reading_device::Entity::insert(entry)
			.on_conflict(
				OnConflict::columns([reading_device::Column::Id])
					// TODO: not quite right, if a device is shared might need a
					// dual key on (id, user_id)
					.update_columns([
						reading_device::Column::Name,
						reading_device::Column::UpdatedAt,
					])
					.to_owned(),
			)
			.exec_with_returning(conn)
			.await?;

		Ok(upserted_entry)
	}

	/// Deletes a reading device owned by the authenticated user
	async fn delete_reading_device(
		&self,
		ctx: &Context<'_>,
		device_id: i32,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let Some(device) = reading_device::Entity::find_for_user(user)
			.filter(reading_device::Column::Id.eq(device_id))
			.one(conn)
			.await?
		else {
			return Err("Reading device not found".into());
		};

		let device = device.into_active_model();
		device.delete(conn).await?;

		Ok(true)
	}
}
