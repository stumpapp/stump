use async_graphql::{ComplexObject, Context, Result, SimpleObject};

use models::{
	entity::{
		emailer_send_record::{self, AttachmentMetaModel},
		media, user,
	},
	shared::enums::UserPermission,
};
use sea_orm::prelude::*;

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	object::media::Media,
};

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

	async fn attachment_meta(&self) -> Result<Vec<AttachmentMeta>> {
		match self.model.attachment_meta {
			None => Ok(vec![]),
			Some(ref meta) => {
				let models = AttachmentMetaModel::vec_from_data(meta.as_slice())
					.map_err(|_| "Failed to parse attachment meta")?;
				Ok(models.into_iter().map(AttachmentMeta::from).collect())
			},
		}
	}
}

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct AttachmentMeta {
	#[graphql(flatten)]
	pub model: emailer_send_record::AttachmentMetaModel,
}

impl From<emailer_send_record::AttachmentMetaModel> for AttachmentMeta {
	fn from(entity: emailer_send_record::AttachmentMetaModel) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl AttachmentMeta {
	async fn media(&self, ctx: &Context<'_>) -> Result<Option<Media>> {
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let Some(media_id) = &self.model.media_id else {
			return Ok(None);
		};

		let model = media::ModelWithMetadata::find_by_id_for_user(media_id.clone(), user)
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?;

		Ok(model.map(Media::from))
	}
}
