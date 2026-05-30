use std::collections::HashMap;

use async_graphql::{Context, Object, Result, ID};
use chrono::Utc;
use models::{
	domain::reading_progress::{
		calculate_logical_date, compute_page_based_percentage, should_extend_session,
	},
	entity::{media, reading_session},
	services::reading_progress::{
		derive_readthrough_number, get_book_pages, upsert_reading_session,
		NormalizedProgression,
	},
	shared::enums::ReadingStatus,
};
use sea_orm::{
	prelude::Decimal, ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait,
	IntoActiveModel, QueryFilter, QueryOrder, QuerySelect, QueryTrait, TransactionTrait,
};

use crate::{
	data::{AuthContext, CoreContext},
	input::media::MediaProgressInput,
	object::reading_session::ReadingSession,
};

#[derive(Default)]
pub struct ReadProgressMutation;

#[Object]
impl ReadProgressMutation {
	async fn update_media_progress(
		&self,
		ctx: &Context<'_>,
		id: ID,
		input: MediaProgressInput,
	) -> Result<ReadingSession> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let progression = match input {
			MediaProgressInput::Epub(input) => {
				let (epubcfi, locator) = input.locator.as_tuple();
				let is_complete = input.is_complete.unwrap_or(
					input.percentage.unwrap_or_default() >= Decimal::new(1, 0),
				);
				NormalizedProgression {
					page: None,
					locator,
					epubcfi,
					percentage: input.percentage,
					elapsed_seconds_delta: input.elapsed_seconds_delta,
					did_complete: is_complete,
					device_id: input.device_id,
				}
			},
			MediaProgressInput::Paged(input) => {
				let book_pages = get_book_pages(id.to_string(), conn).await?;
				let is_complete = input.page >= book_pages;
				let percentage = compute_page_based_percentage(input.page, book_pages);
				NormalizedProgression {
					page: Some(input.page),
					locator: None,
					epubcfi: None,
					percentage: Some(percentage),
					elapsed_seconds_delta: input.elapsed_seconds_delta,
					did_complete: is_complete,
					device_id: input.device_id,
				}
			},
		};

		upsert_reading_session(
			conn,
			user,
			id.as_ref(),
			progression,
			core.config.book_completion_dedup_timeout_secs,
		)
		.await
		.map(ReadingSession::from)
		.map_err(Into::into)
	}

	/// trashes current readthrough, if there is one
	#[tracing::instrument(skip(self, ctx), fields(media_id = ?id))]
	async fn clear_media_progress(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let tx = core.conn.begin().await?;

		let current_session = reading_session::Entity::find()
			.filter(
				reading_session::Column::UserId
					.eq(user.id.clone())
					.and(reading_session::Column::MediaId.eq(id.to_string())),
			)
			.order_by_desc(reading_session::Column::CreatedAt)
			.one(&tx)
			.await?;

		let Some(session) = current_session else {
			// no active session = no work to do
			return Ok(false);
		};

		if session.is_finalized() {
			// already marked = no work to do
			return Ok(true);
		}

		// we just delete non-completed ones with the same readthrough number
		let affected_rows = reading_session::Entity::delete_many()
			.filter(
				reading_session::Column::UserId
					.eq(user.id.clone())
					.and(reading_session::Column::MediaId.eq(id.to_string())),
			)
			.filter(
				reading_session::Column::ReadthroughNumber.eq(session.readthrough_number),
			)
			.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
			.exec(&tx)
			.await?
			.rows_affected;

		tracing::debug!(
			?affected_rows,
			readthrough_number = session.readthrough_number,
			"Removed reading sessions for the book's current readthrough"
		);

		tx.commit().await?;

		Ok(affected_rows > 0)
	}

	/// marks current readthrough as complete:
	/// - if no current readthrough, creates one
	/// - if `dnf` is true, it will mark the readthrough as such
	#[tracing::instrument(skip(self, ctx), fields(media_id = ?id))]
	async fn finish_media_progress(
		&self,
		ctx: &Context<'_>,
		id: ID,
		#[graphql(default)] dnf: Option<bool>,
	) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let tx = core.conn.begin().await?;

		let current_session = reading_session::Entity::find()
			.filter(
				reading_session::Column::UserId
					.eq(user.id.clone())
					.and(reading_session::Column::MediaId.eq(id.to_string())),
			)
			.order_by_desc(reading_session::Column::CreatedAt)
			.one(&tx)
			.await?;

		let (grace_period, day_reset_offset) = user
			.preferences
			.as_ref()
			.map(|p| (p.reading_session_grace_period_secs, p.day_reset_hour_offset))
			.unwrap_or((1800, 0));
		let logical_today = calculate_logical_date(Utc::now(), day_reset_offset);

		let session = match current_session {
			Some(ref s) if s.is_finalized() => {
				// already marked = no work to do
				return Ok(true);
			},
			Some(s) if should_extend_session(&s, grace_period) => s,
			// previous session elapsed so we create a new one to preserve the sacred timeline
			Some(s) => {
				reading_session::ActiveModel {
					user_id: Set(user.id.clone()),
					media_id: Set(id.to_string()),
					readthrough_number: Set(s.readthrough_number),
					session_date: Set(logical_today),
					..Default::default()
				}
				.insert(&tx)
				.await?
			},
			None => {
				let readthrough_number =
					derive_readthrough_number(&tx, &user.id, id.as_ref()).await?;

				reading_session::ActiveModel {
					user_id: Set(user.id.clone()),
					media_id: Set(id.to_string()),
					readthrough_number: Set(readthrough_number),
					session_date: Set(logical_today),
					..Default::default()
				}
				.insert(&tx)
				.await?
			},
		};

		let mut active: reading_session::ActiveModel = session.into();
		let did_dnf = dnf.unwrap_or(false);
		if did_dnf {
			active.status = Set(ReadingStatus::Abandoned);
		} else {
			let book_pages = get_book_pages(id.to_string(), &tx).await?;
			active.end_page = Set(Some(book_pages));
			active.end_percentage = Set(Some(Decimal::new(1, 0)));
			active.status = Set(ReadingStatus::Finished);
		}

		active.update(&tx).await?;

		tx.commit().await?;

		Ok(true)
	}

	/// trashes all completed readthroughs for the media
	#[tracing::instrument(skip(self, ctx), fields(media_id = ?id))]
	async fn delete_media_reading_history(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<i64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let current_readthrough = reading_session::Entity::find()
			.filter(
				reading_session::Column::UserId
					.eq(user.id.clone())
					.and(reading_session::Column::MediaId.eq(id.to_string())),
			)
			.filter(
				reading_session::Column::Status
					.ne(ReadingStatus::Finished)
					.and(reading_session::Column::Status.ne(ReadingStatus::Abandoned)),
			)
			.order_by_desc(reading_session::Column::CreatedAt)
			.one(conn)
			.await?
			.map(|s| s.readthrough_number);

		let affected_rows = reading_session::Entity::delete_many()
			.filter(
				reading_session::Column::UserId
					.eq(user.id.clone())
					.and(reading_session::Column::MediaId.eq(id.to_string())),
			)
			.apply_if(current_readthrough, |q, readthrough| {
				q.filter(reading_session::Column::ReadthroughNumber.ne(readthrough))
			})
			.exec(conn)
			.await?
			.rows_affected;

		tracing::debug!(
			?affected_rows,
			"Removed completed reading sessions for book"
		);

		Ok(affected_rows.try_into()?)
	}

	// TODO(pedantic): this name kinda worked for finish_media_progress (kinda) but
	// is even more awk for series... maybe rename

	/// marks all books in the series as finished
	async fn finish_series_progress(&self, ctx: &Context<'_>, id: ID) -> Result<i64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let tx = core.conn.begin().await?;

		let books = media::Entity::find_for_series_id(user, id.to_string())
			.select_only()
			.columns([media::Column::Id, media::Column::Pages])
			.into_tuple::<(String, i32)>()
			.all(&tx)
			.await?;

		if books.is_empty() {
			tracing::debug!("No books found in series, nothing to mark as finished");
			return Ok(0);
		}

		let book_ids_subquery = media::Entity::find_for_series_id(user, id.to_string())
			.select_only()
			.column(media::Column::Id)
			.into_query();

		let existing_sessions = reading_session::Entity::find()
			.filter(reading_session::Column::UserId.eq(user.id.clone()))
			.filter(reading_session::Column::MediaId.in_subquery(book_ids_subquery))
			.order_by_desc(reading_session::Column::CreatedAt)
			.all(&tx)
			.await?;

		let mut latest_by_book = HashMap::new();
		for session in existing_sessions {
			// first session encountered for each book _should_ be the latest due
			// to ordering
			latest_by_book
				.entry(session.media_id.clone())
				.or_insert(session);
		}

		let (grace_period, day_reset_offset) = user
			.preferences
			.as_ref()
			.map(|p| (p.reading_session_grace_period_secs, p.day_reset_hour_offset))
			.unwrap_or((1800, 0));
		let logical_today = calculate_logical_date(Utc::now(), day_reset_offset);

		let mut changed = 0;

		for (book_id, pages) in books.iter() {
			let session_to_finalize = match latest_by_book.remove(book_id) {
				Some(session) if session.is_finalized() => {
					// already marked = no work
					continue;
				},
				Some(session) if should_extend_session(&session, grace_period) => session,
				// previous session elapsed so we create a new one to preserve the sacred timeline
				Some(session) => {
					reading_session::ActiveModel {
						user_id: Set(user.id.clone()),
						media_id: Set(book_id.clone()),
						readthrough_number: Set(session.readthrough_number),
						session_date: Set(logical_today),
						..Default::default()
					}
					.insert(&tx)
					.await?
				},
				// no session at all = no reading activity
				None => {
					reading_session::ActiveModel {
						user_id: Set(user.id.clone()),
						media_id: Set(book_id.clone()),
						readthrough_number: Set(1),
						session_date: Set(logical_today),
						..Default::default()
					}
					.insert(&tx)
					.await?
				},
			};

			let mut active = session_to_finalize.into_active_model();
			active.end_page = Set(Some(*pages));
			active.end_percentage = Set(Some(Decimal::new(1, 0)));
			active.status = Set(ReadingStatus::Finished);
			active.update(&tx).await?;
			changed += 1;
		}

		tx.commit().await?;

		Ok(changed)
	}

	// TODO: consider flag for clear_active_progress?
	/// trashes all completed readthroughs for all books in this series, preserving any active
	/// readthroughs
	async fn clear_series_reading_history(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<i64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let tx = core.conn.begin().await?;

		let books = media::Entity::find_for_series_id(user, id.to_string())
			.select_only()
			.columns([media::Column::Id])
			.into_tuple::<String>()
			.all(&tx)
			.await?;

		if books.is_empty() {
			tracing::debug!("No books found in series, nothing to mark as finished");
			return Ok(0);
		}

		let book_ids_subquery = media::Entity::find_for_series_id(user, id.to_string())
			.select_only()
			.column(media::Column::Id)
			.into_query();

		let existing_sessions = reading_session::Entity::find()
			.filter(reading_session::Column::UserId.eq(user.id.clone()))
			.filter(reading_session::Column::MediaId.in_subquery(book_ids_subquery))
			.order_by_desc(reading_session::Column::CreatedAt)
			.all(&tx)
			.await?;

		let mut latest_by_book = HashMap::new();
		for session in existing_sessions {
			// first session encountered for each book _should_ be the latest due
			// to ordering
			latest_by_book
				.entry(session.media_id.clone())
				.or_insert(session);
		}

		let mut deleted = 0;

		for book_id in books.iter() {
			match latest_by_book.remove(book_id) {
				Some(session) if session.is_finalized() => {
					// delete sessions for this book/user with readthrough <= session.readthrough_number (i.e., read history)
					let affected_rows = reading_session::Entity::delete_many()
						.filter(
							reading_session::Column::UserId.eq(user.id.clone()).and(
								reading_session::Column::MediaId.eq(book_id.clone()),
							),
						)
						.filter(
							reading_session::Column::ReadthroughNumber
								.lte(session.readthrough_number),
						)
						.exec(&tx)
						.await?
						.rows_affected;
					deleted += affected_rows;
				},
				Some(session) => {
					// keep the current active readthrough, but clear all earlier readthrough history
					let affected_rows = reading_session::Entity::delete_many()
						.filter(
							reading_session::Column::UserId.eq(user.id.clone()).and(
								reading_session::Column::MediaId.eq(book_id.clone()),
							),
						)
						.filter(
							reading_session::Column::ReadthroughNumber
								.lt(session.readthrough_number),
						)
						.exec(&tx)
						.await?
						.rows_affected;
					deleted += affected_rows;
				},
				_ => {
					// no sessions for this book
					continue;
				},
			}
		}

		tx.commit().await?;

		Ok(deleted.try_into()?)
	}
}
