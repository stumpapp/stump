use async_graphql::{Context, Object, Result, ID};
use models::entity::{media, reading_session};
use sea_orm::{prelude::*, QuerySelect};
use stump_core::filesystem::media::analyze_media_job::AnalyzeMediaJob;

use crate::{
	data::{CoreContext, RequestContext},
	object::media::Media,
};

pub struct MediaMutation;

#[Object]
impl MediaMutation {
	async fn analyze_media(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = media::Entity::find_for_user(user)
			.select_only()
			.columns(vec![media::Column::Id, media::Column::Path])
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::MediaIdentSelect>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		core.enqueue_job(AnalyzeMediaJob::analyze_media_item(model.id))?;

		Ok(true)
	}

	// TODO(graphql): Implement convert_media in core then here
	async fn convert_media(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let _model = media::Entity::find_for_user(user)
			.select_only()
			.columns(vec![media::Column::Id, media::Column::Path])
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::MediaIdentSelect>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		// if media.extension != "cbr" || media.extension != "rar" {
		//     return Err(APIError::BadRequest(String::from(
		//         "Stump only supports RAR to ZIP conversions at this time",
		//     )));
		// }

		Err("Not implemented".into())
	}

	// TODO(graphql): (thumbnail API remains RESTful). This serves as a reminder, it won't live here

	async fn delete_media_progress(&self, ctx: &Context<'_>, id: ID) -> Result<Media> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		let affected_sessions = reading_session::Entity::delete_many()
			.filter(
				reading_session::Column::MediaId
					.eq(model.media.id.clone())
					.and(reading_session::Column::UserId.eq(user.id.clone())),
			)
			.exec(conn)
			.await?
			.rows_affected;
		tracing::debug!(affected_sessions, "Deleted user reading sessions for media");

		// Note: We return the full node for cache invalidation purposes
		Ok(Media::from(model))
	}

	// update_media_progress

	// mark_as_completed (put_media_complete_status)

	// TODO: consider separate mutation object for media metadata?
	// update_media_metadata (put_media_metadata)
}
