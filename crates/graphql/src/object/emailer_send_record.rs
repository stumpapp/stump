use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::{
	entity::{
		emailer_send_record::{self, AttachmentMeta},
		user,
	},
	shared::enums::UserPermission,
};
use sea_orm::prelude::*;

use crate::{data::CoreContext, guard::PermissionGuard};

use super::user::User;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct EmailerSendRecord {
	#[graphql(flatten)]
	pub model: emailer_send_record::Model,
}

impl From<emailer_send_record::Model> for EmailerSendRecord {
	fn from(entity: emailer_send_record::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl EmailerSendRecord {
	#[graphql(guard = "PermissionGuard::one(UserPermission::ReadUsers)")]
	async fn sent_by(&self, ctx: &Context<'_>) -> Result<Option<User>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		if let Some(id) = self.model.sent_by_user_id.clone() {
			let user = user::Entity::find_by_id(&id)
				.one(conn)
				.await?
				.ok_or("User not found")?;
			Ok(Some(user.into()))
		} else {
			Ok(None)
		}
	}

	async fn attachment_meta(&self, _ctx: &Context<'_>) -> Result<Vec<AttachmentMeta>> {
		match self.model.attachment_meta {
			None => return Ok(vec![]),
			Some(ref meta) => Ok(AttachmentMeta::try_from_data(meta)
				.map_err(|_| "Failed to parse attachment meta")?),
		}
	}
}
