use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::media::MediaMetadataInput,
	object::media::Media,
};
use async_graphql::{Context, Object, Result, ID};
use models::{entity::media, shared::enums::UserPermission};
use sea_orm::{prelude::*, ActiveValue::Set, IntoActiveModel};

#[derive(Default)]
pub struct MediaMetadataMutation;

#[Object]
impl MediaMetadataMutation {
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditMetadata)")]
	async fn update_media_metadata(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: MediaMetadataInput,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		let updated_metadata = if let Some(existing) = model.metadata {
			let mut active_model = input.into_active_model();
			active_model.id = Set(existing.id);
			active_model.media_id = Set(Some(model.media.id.clone()));
			active_model.update(conn).await?
		} else {
			let mut active_model = input.into_active_model();
			active_model.media_id = Set(Some(model.media.id.clone()));
			active_model.insert(conn).await?
		};

		let model = media::ModelWithMetadata {
			media: model.media,
			metadata: Some(updated_metadata),
		};

		Ok(model.into())
	}

	// FIXME: Implement
	#[graphql(guard = "PermissionGuard::one(UserPermission::MetadataFetchStatusManage)")]
	async fn fetch_media_metadata(&self, ctx: &Context<'_>, id: ID) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		unimplemented!()
	}
}
