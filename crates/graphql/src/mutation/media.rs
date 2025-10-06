use async_graphql::{Context, Object, Result, Union, ID};
use chrono::Utc;
use models::{
	entity::{
		favorite_media, finished_reading_session, library, library_config, media,
		reading_session, series, user::AuthUser,
	},
	shared::enums::UserPermission,
};
use sea_orm::{
	prelude::*,
	sea_query::{OnConflict, Query},
	DatabaseTransaction, IntoActiveModel, QuerySelect, Set, TransactionTrait,
};
use stump_core::{
	filesystem::{
		image::{generate_book_thumbnail, GenerateThumbnailOptions},
		media::analyze_media_job::AnalyzeMediaJob,
	},
	utils::chain_optional_iter,
};

use crate::{
	data::{AuthContext, CoreContext},
	guard::PermissionGuard,
	input::{
		media::{MediaMetadataInput, MediaProgressInput},
		thumbnail::PageBasedThumbnailInput,
	},
	object::{
		media::Media,
		reading_session::{ActiveReadingSession, FinishedReadingSession},
	},
};

#[derive(Debug, Union)]
pub enum ReadingProgressOutput {
	Active(Box<ActiveReadingSession>),
	Finished(Box<FinishedReadingSession>),
}

#[derive(Default)]
pub struct MediaMutation;

#[Object]
impl MediaMutation {
	async fn analyze_media(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
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
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
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

	async fn delete_media(&self, ctx: &Context<'_>, id: ID) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;
		let mut active_model = model.media.clone().into_active_model();
		active_model.deleted_at = Set(Some(Utc::now().into()));
		let deleted_book = active_model.update(conn).await?;

		Ok(Media::from(media::ModelWithMetadata {
			media: deleted_book,
			..model
		}))
	}

	async fn favorite_media(
		&self,
		ctx: &Context<'_>,
		id: ID,
		is_favorite: bool,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(
				media::Column::Id
					.eq(id.to_string())
					.and(media::Column::DeletedAt.is_null()),
			)
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		if is_favorite {
			let last_insert_id =
				favorite_media::Entity::insert(favorite_media::ActiveModel {
					user_id: Set(user.id.clone()),
					media_id: Set(model.media.id.clone()),
					favorited_at: Set(DateTimeWithTimeZone::from(Utc::now())),
				})
				.on_conflict(OnConflict::new().do_nothing().to_owned())
				.exec(core.conn.as_ref())
				.await?
				.last_insert_id;
			tracing::debug!(?last_insert_id, "Added favorite media");
		} else {
			let affected_rows = favorite_media::Entity::delete_many()
				.filter(
					favorite_media::Column::UserId
						.eq(user.id.clone())
						.and(favorite_media::Column::MediaId.eq(model.media.id.clone())),
				)
				.exec(core.conn.as_ref())
				.await?
				.rows_affected;
			tracing::debug!(?affected_rows, "Removed favorite media");
		}

		Ok(model.into())
	}

	/// Update the thumbnail for a book. This will replace the existing thumbnail with the the one
	/// associated with the provided input (book). If the book does not have a thumbnail, one
	/// will be generated based on the library's thumbnail configuration.
	#[graphql(guard = "PermissionGuard::one(UserPermission::EditLibrary)")]
	async fn update_media_thumbnail(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: PageBasedThumbnailInput,
	) -> Result<Media> {
		let core = ctx.data::<CoreContext>()?;
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;

		let book = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(core.conn.as_ref())
			.await?
			.ok_or("Book not found")?;

		let series_id = book
			.media
			.series_id
			.clone()
			.ok_or("Series ID not set on book")?;

		let (_library, config) = library::Entity::find_for_user(user)
			.filter(
				library::Column::Id.in_subquery(
					Query::select()
						.column(series::Column::LibraryId)
						.from(series::Entity)
						.and_where(series::Column::Id.eq(series_id))
						.to_owned(),
				),
			)
			.find_also_related(library_config::Entity)
			.one(core.conn.as_ref())
			.await?
			.ok_or("Associated library for book not found")?;

		let page = input.page();

		if book.media.extension == "epub" && page > 1 {
			return Err("Cannot set thumbnail from EPUB chapter".into());
		}

		let image_options = config
			.ok_or("Library config not found")?
			.thumbnail_config
			.unwrap_or_default()
			.with_page(page);

		let (_, path_buf, _) = generate_book_thumbnail(
			&book.media.clone().into(),
			GenerateThumbnailOptions {
				image_options,
				core_config: core.config.as_ref().clone(),
				force_regen: true,
				filename: Some(id.to_string()),
			},
		)
		.await?;
		tracing::debug!(path = ?path_buf, "Generated book thumbnail");

		Ok(book.into())
	}

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

	async fn delete_media_progress(&self, ctx: &Context<'_>, id: ID) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
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

	/// Deletes all of a user's reading history for a specific media item. This cannot be undone, so
	/// use with caution.
	async fn delete_media_read_history(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<Media> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let conn = ctx.data::<CoreContext>()?.conn.as_ref();

		let model = media::ModelWithMetadata::find_for_user(user)
			.filter(media::Column::Id.eq(id.to_string()))
			.into_model::<media::ModelWithMetadata>()
			.one(conn)
			.await?
			.ok_or("Media not found")?;

		let affected_sessions = finished_reading_session::Entity::delete_many()
			.filter(
				finished_reading_session::Column::MediaId
					.eq(model.media.id.clone())
					.and(finished_reading_session::Column::UserId.eq(user.id.clone())),
			)
			.exec(conn)
			.await?
			.rows_affected;
		tracing::debug!(
			affected_sessions,
			"Deleted user finished reading sessions for media"
		);

		// Note: We return the full node for cache invalidation purposes
		Ok(Media::from(model))
	}

	async fn update_media_progress(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: MediaProgressInput,
	) -> Result<ReadingProgressOutput> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let mut active_session = reading_session::ActiveModel {
			user_id: Set(user.id.clone()),
			media_id: Set(id.to_string()),
			updated_at: Set(Some(Utc::now().into())),
			started_at: Set(Utc::now().into()),
			..Default::default()
		};

		let is_complete: bool;

		match input.clone() {
			MediaProgressInput::Epub(input) => {
				let (epubcfi, locator) = input.locator.as_tuple();
				active_session.epubcfi = Set(epubcfi);
				active_session.locator = Set(locator);
				active_session.percentage_completed = Set(input.percentage);
				active_session.elapsed_seconds = Set(input.elapsed_seconds);
				is_complete = input.is_complete.unwrap_or(
					input.percentage.unwrap_or_default() >= Decimal::new(1, 0),
				);
			},
			MediaProgressInput::Paged(input) => {
				active_session.page = Set(Some(input.page));
				active_session.elapsed_seconds = Set(input.elapsed_seconds);

				let book_pages = get_book_pages(id.to_string(), conn).await?;
				is_complete = input.page >= book_pages;
				active_session.percentage_completed =
					Set(Some(compute_page_based_percentage(input.page, book_pages)));
			},
		}

		let on_conflict_update_cols = chain_optional_iter(
			[
				reading_session::Column::UpdatedAt,
				reading_session::Column::PercentageCompleted,
			],
			[
				(matches!(input, MediaProgressInput::Epub(_)))
					.then(|| reading_session::Column::Epubcfi),
				(matches!(input, MediaProgressInput::Epub(_)))
					.then(|| reading_session::Column::Locator),
				(matches!(input, MediaProgressInput::Paged(_)))
					.then(|| reading_session::Column::Page),
			],
		);

		let active_session = reading_session::Entity::insert(active_session.clone())
			.on_conflict(
				OnConflict::columns(vec![
					reading_session::Column::MediaId,
					reading_session::Column::UserId,
				])
				.update_columns(on_conflict_update_cols)
				.to_owned(),
			)
			.exec_with_returning(conn)
			.await?;

		if !is_complete {
			Ok(ReadingProgressOutput::Active(Box::new(
				active_session.into(),
			)))
		} else {
			let finished_reading_session = finished_reading_session::ActiveModel {
				user_id: Set(user.id.clone()),
				media_id: Set(id.to_string()),
				started_at: Set(active_session
					.updated_at
					.unwrap_or_else(|| chrono::Utc::now().into())),
				completed_at: Set(chrono::Utc::now().into()),
				elapsed_seconds: Set(active_session.elapsed_seconds),
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

			Ok(ReadingProgressOutput::Finished(Box::new(
				finished_reading_session.into(),
			)))
		}
	}

	async fn mark_media_as_complete(
		&self,
		ctx: &Context<'_>,
		id: ID,
		is_complete: bool,
		page: Option<i32>,
	) -> Result<Option<finished_reading_session::Model>> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
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

	let active_session = reading_session::ActiveModel {
		user_id: Set(user.id.clone()),
		media_id: Set(model.media.id.to_string()),
		page: Set(Some(page)),
		updated_at: Set(Some(chrono::Utc::now().into())),
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

async fn insert_finished_reading_session(
	active_session: Option<reading_session::Model>,
	finished_reading_session: finished_reading_session::ActiveModel,
	txn: &DatabaseTransaction,
) -> Result<finished_reading_session::Model> {
	// Note that finished reading session is used as a read history, so we don't
	// clean up existing ones. The active reading session is deleted, though.
	let finished_reading_session = finished_reading_session.insert(txn).await?;

	if let Some(active_session) = active_session.clone() {
		let _ = active_session.delete(txn).await?;
	}

	Ok(finished_reading_session)
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

fn compute_page_based_percentage(current_page: i32, pages: i32) -> Decimal {
	if pages <= 0 {
		Decimal::new(0, 0)
	} else {
		let percentage =
			Decimal::new(current_page as i64, 0) / Decimal::new(pages as i64, 0);
		// Cannot be negative and cannot be more than 100%
		percentage.clamp(Decimal::new(0, 0), Decimal::new(100, 0))
	}
}

async fn get_book_pages(book_id: String, conn: &DatabaseConnection) -> Result<i32> {
	let pages: i32 = media::Entity::find_by_id(book_id)
		.select_only()
		.columns(vec![media::Column::Pages])
		.into_tuple()
		.one(conn)
		.await?
		.ok_or("Media not found")?;
	Ok(pages)
}
