use async_graphql::{Context, Object, Result, ID};
use models::entity::{finished_reading_session, media, reading_session, user::AuthUser};
use sea_orm::{
	prelude::*, sea_query::OnConflict, DatabaseTransaction, QuerySelect, Set,
	TransactionTrait,
};
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
		elapsed_seconds: Option<i64>,
	) -> Result<ReadingProgressOutput> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let active_session = reading_session::ActiveModel {
			user_id: Set(user.id.clone()),
			media_id: Set(id.to_string()),
			page: Set(page),
			updated_at: Set(chrono::Utc::now().into()),
			elapsed_seconds: Set(elapsed_seconds),
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

		if !is_complete {
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

			let txn = conn.begin().await?;
			let finished_reading_session = insert_finished_reading_session(
				Some(active_session),
				finished_reading_session,
				&txn,
			)
			.await?;
			txn.commit().await?;

			Ok(ReadingProgressOutput::new(
				None,
				Some(finished_reading_session.into()),
			))
		}
	}

	async fn mark_media_as_complete(
		&self,
		ctx: &Context<'_>,
		id: ID,
		is_complete: bool,
		page: Option<i32>,
	) -> Result<Option<finished_reading_session::Model>> {
		let RequestContext { user, .. } = ctx.data::<RequestContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		if is_complete {
			let txn = conn.begin().await?;
			let finished_reading_session =
				set_completed_media(user, &txn, &model).await?;
			txn.commit().await?;
			Ok(Some(finished_reading_session))
		} else {
			let _active_session =
				update_active_reading_session(user, conn, &model, page).await?;
			Ok(None)
		}
	}

	// TODO: consider separate mutation object for media metadata?
	// update_media_metadata (put_media_metadata)
}

async fn update_active_reading_session(
	user: &AuthUser,
	conn: &DatabaseConnection,
	model: &media::ModelWithMetadata,
	page: Option<i32>,
) -> Result<reading_session::Model> {
	let page = match model.media.extension.as_str() {
		"epub" => -1,
		_ => page.unwrap_or(model.media.pages),
	};

	// upsert reading_session
	let active_session = reading_session::ActiveModel {
		user_id: Set(user.id.clone()),
		media_id: Set(model.media.id.to_string()),
		page: Set(Some(page)),
		updated_at: Set(chrono::Utc::now().into()),
		..Default::default()
	};

	let active_session = reading_session::Entity::insert(active_session.clone())
		.on_conflict(
			OnConflict::columns(vec![
				reading_session::Column::MediaId,
				reading_session::Column::UserId,
			])
			.update_columns(vec![reading_session::Column::Page])
			.to_owned(),
		)
		.exec_with_returning(conn)
		.await?;

	Ok(active_session)
}

async fn set_completed_media(
	user: &AuthUser,
	txn: &DatabaseTransaction,
	model: &media::ModelWithMetadata,
) -> Result<finished_reading_session::Model> {
	let active_session =
		reading_session::Entity::find_for_user_and_media_id(user, &model.media.id)
			.one(txn)
			.await?;

	let started_at = active_session
		.as_ref()
		.map(|s| s.started_at)
		.unwrap_or_default();

	let finished_reading_session = finished_reading_session::ActiveModel {
		user_id: Set(user.id.clone()),
		media_id: Set(model.media.id.to_string()),
		started_at: Set(started_at),
		completed_at: Set(chrono::Utc::now().into()),
		..Default::default()
	};

	let finished_reading_session =
		insert_finished_reading_session(active_session, finished_reading_session, txn)
			.await?;
	Ok(finished_reading_session)
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
