use async_graphql::{Context, Object, Result, ID};
use models::entity::{finished_reading_session, media, reading_session};
use sea_orm::{prelude::*, sea_query::OnConflict, QuerySelect, Set};
use stump_core::filesystem::media::analyze_media_job::AnalyzeMediaJob;

use crate::{
	data::{CoreContext, RequestContext},
	mutation::epub::ReadingProgressOutput,
	object::media::Media,
};

use super::epub::insert_finished_reading_session;

#[derive(Default)]
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
	async fn update_media_progress(
		&self,
		ctx: &Context<'_>,
		id: ID,
		page: Option<i32>,
	) -> Result<ReadingProgressOutput> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		// upsert reading_session
		let active_session = reading_session::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			user_id: Set(user.id.clone()),
			media_id: Set(id.to_string()),
			page: Set(page),
			updated_at: Set(chrono::Utc::now().into()),
			..Default::default()
		};

		let active_session = reading_session::Entity::insert(active_session.clone())
			.on_conflict(
				OnConflict::columns(vec![
					reading_session::Column::MediaId,
					reading_session::Column::UserId,
				])
				.update_columns(vec![
					reading_session::Column::Page,
					reading_session::Column::UpdatedAt,
				])
				.to_owned(),
			)
			.exec_with_returning(conn)
			.await?;

		let is_complete =
			is_progress_complete(active_session.media_id.clone(), page, conn).await?;

		if is_complete {
			Ok(ReadingProgressOutput::new(
				Some(active_session.into()),
				None,
			))
		} else {
			let finished_reading_session = finished_reading_session::ActiveModel {
				user_id: Set(user.id.clone()),
				media_id: Set(id.to_string()),
				started_at: Set(active_session.updated_at),
				completed_at: Set(chrono::Utc::now().into()),
				..Default::default()
			};

			let finished_reading_session = insert_finished_reading_session(
				Some(active_session),
				finished_reading_session,
				conn,
			)
			.await?;

			Ok(ReadingProgressOutput::new(
				None,
				Some(finished_reading_session.into()),
			))
		}
	}

	// mark_as_completed (put_media_complete_status)

	// TODO: consider separate mutation object for media metadata?
	// update_media_metadata (put_media_metadata)
}

async fn is_progress_complete(
	media_id: String,
	page: Option<i32>,
	conn: &DatabaseConnection,
) -> Result<bool> {
	if let Some(page) = page {
		let pages: i32 = media::Entity::find_by_id(media_id)
			.select_only()
			.columns(vec![media::Column::Pages])
			.into_tuple()
			.one(conn)
			.await?
			.ok_or("Media not found")?;
		Ok(page >= pages)
	} else {
		Ok(false)
	}
}
