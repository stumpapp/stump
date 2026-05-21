use std::collections::HashMap;

use async_graphql::{Context, Object, Result, ID};
use chrono::{DateTime, Duration, NaiveDate, Utc};
use models::{
	entity::{media, reading_session_v2, user::AuthUser},
	shared::{enums::ReadingStatus, readium::ReadiumLocator},
};
use sea_orm::{
	prelude::Decimal, ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait,
	EntityTrait, IntoActiveModel, QueryFilter, QueryOrder, QuerySelect, QueryTrait,
	TransactionTrait,
};

use crate::{
	data::{AuthContext, CoreContext},
	input::media::MediaProgressInput,
	object::reading_session_v2::ReadingSession,
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

	// TODO(v2-sessions): i didn't quite do this correctly the first pass, it's a bit trickier
	// when considering read history. i think it should:
	// - if actively reading (any readthrough) and is_complete, complete _that_ readthrough (should work as-is)
	// - if actively reading and !is_complete, trash current readthrough?
	// ugh idk, maybe separate mutations more semantically named would make sense? like:
	// - clear_active_progress (trashes current readthrough, if any)
	// - finish_active_progress (marks current readthrough as complete, if any)
	// - clear_reading_history (trashes all readthroughs for the media)
	// i kinda like that, would need to do the same for series as well. it makes it less ambiguous for me
	// in my head at least
	async fn mark_media_as_complete(
		&self,
		ctx: &Context<'_>,
		id: ID,
		is_complete: bool,
		page: Option<i32>,
	) -> Result<Option<ReadingSession>> {
		// let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		// let core = ctx.data::<CoreContext>()?;
		// let conn = core.conn.as_ref();

		// let (extension, total_pages): (String, i32) =
		// 	media::Entity::find_by_id(id.to_string())
		// 		.select_only()
		// 		.column(media::Column::Extension)
		// 		.column(media::Column::Pages)
		// 		.into_tuple()
		// 		.one(conn)
		// 		.await?
		// 		.ok_or("Media not found")?;

		// let mut progression = NormalizedProgression::default();

		// if is_complete {
		// 	progression.page = Some(total_pages);
		// 	progression.percentage = Some(Decimal::new(1, 0));
		// } else {
		// 	progression.page = match extension.as_str() {
		// 		"epub" => None,
		// 		_ => Some(page.unwrap_or(1)),
		// 	};
		// }

		// let session = upsert_reading_session(
		// 	conn,
		// 	user,
		// 	id.as_ref(),
		// 	progression,
		// 	core.config.book_completion_dedup_timeout_secs,
		// )
		// .await?;

		// if is_complete {
		// 	Ok(Some(ReadingSession::from(session)))
		// } else {
		// 	Ok(None)
		// }
		Ok(None) // placeholder until i decide how to approach this, see above
	}

	/// trashes current readthrough, if there is one
	#[tracing::instrument(skip(self, ctx), fields(media_id = ?id))]
	async fn clear_media_progress(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;

		let tx = core.conn.begin().await?;

		let current_session = reading_session_v2::Entity::find()
			.filter(
				reading_session_v2::Column::UserId
					.eq(user.id.clone())
					.and(reading_session_v2::Column::MediaId.eq(id.to_string())),
			)
			.order_by_desc(reading_session_v2::Column::CreatedAt)
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
		let affected_rows = reading_session_v2::Entity::delete_many()
			.filter(
				reading_session_v2::Column::UserId
					.eq(user.id.clone())
					.and(reading_session_v2::Column::MediaId.eq(id.to_string())),
			)
			.filter(
				reading_session_v2::Column::ReadthroughNumber
					.eq(session.readthrough_number),
			)
			.filter(reading_session_v2::Column::Status.eq(ReadingStatus::Reading))
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

	// TODO(v2-sessions): we need to create a new session if elapsed, otherwise we fuck with the
	// sacred timeline

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

		let current_session = reading_session_v2::Entity::find()
			.filter(
				reading_session_v2::Column::UserId
					.eq(user.id.clone())
					.and(reading_session_v2::Column::MediaId.eq(id.to_string())),
			)
			.order_by_desc(reading_session_v2::Column::CreatedAt)
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
				reading_session_v2::ActiveModel {
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

				reading_session_v2::ActiveModel {
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

		let mut active: reading_session_v2::ActiveModel = session.into();
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
	async fn clear_media_reading_history(
		&self,
		ctx: &Context<'_>,
		id: ID,
	) -> Result<i64> {
		let AuthContext { user, .. } = ctx.data::<AuthContext>()?;
		let core = ctx.data::<CoreContext>()?;
		let conn = core.conn.as_ref();

		let current_readthrough = reading_session_v2::Entity::find()
			.filter(
				reading_session_v2::Column::UserId
					.eq(user.id.clone())
					.and(reading_session_v2::Column::MediaId.eq(id.to_string())),
			)
			.filter(
				reading_session_v2::Column::Status
					.ne(ReadingStatus::Finished)
					.and(reading_session_v2::Column::Status.ne(ReadingStatus::Abandoned)),
			)
			.order_by_desc(reading_session_v2::Column::CreatedAt)
			.one(conn)
			.await?
			.map(|s| s.readthrough_number);

		let affected_rows = reading_session_v2::Entity::delete_many()
			.filter(
				reading_session_v2::Column::UserId
					.eq(user.id.clone())
					.and(reading_session_v2::Column::MediaId.eq(id.to_string())),
			)
			.apply_if(current_readthrough, |q, readthrough| {
				q.filter(reading_session_v2::Column::ReadthroughNumber.ne(readthrough))
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

	// TODO(v2-sessions): this name kinda worked for finish_media_progress (kinda) but
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

		let existing_sessions = reading_session_v2::Entity::find()
			.filter(reading_session_v2::Column::UserId.eq(user.id.clone()))
			.filter(reading_session_v2::Column::MediaId.in_subquery(book_ids_subquery))
			.order_by_desc(reading_session_v2::Column::CreatedAt)
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
					reading_session_v2::ActiveModel {
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
					reading_session_v2::ActiveModel {
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

		let existing_sessions = reading_session_v2::Entity::find()
			.filter(reading_session_v2::Column::UserId.eq(user.id.clone()))
			.filter(reading_session_v2::Column::MediaId.in_subquery(book_ids_subquery))
			.order_by_desc(reading_session_v2::Column::CreatedAt)
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
					let affected_rows = reading_session_v2::Entity::delete_many()
						.filter(
							reading_session_v2::Column::UserId.eq(user.id.clone()).and(
								reading_session_v2::Column::MediaId.eq(book_id.clone()),
							),
						)
						.filter(
							reading_session_v2::Column::ReadthroughNumber
								.lte(session.readthrough_number),
						)
						.exec(&tx)
						.await?
						.rows_affected;
					deleted += affected_rows;
				},
				_ => {
					// no session or non-finalized session = no completed session to delete
					continue;
				},
			}
		}

		tx.commit().await?;

		Ok(deleted.try_into()?)
	}
}

/// normalized porgression info derived from a [`MediaProgressInput`]
#[derive(Debug, Default)]
pub struct NormalizedProgression {
	pub page: Option<i32>,
	pub locator: Option<ReadiumLocator>,
	pub epubcfi: Option<String>,
	pub percentage: Option<Decimal>,
	pub elapsed_seconds_delta: Option<i64>,
	pub did_complete: bool,
	pub device_id: Option<String>,
}

fn compute_page_based_percentage(current_page: i32, pages: i32) -> Decimal {
	if pages <= 0 {
		Decimal::new(0, 0)
	} else {
		let percentage =
			Decimal::new(current_page as i64, 0) / Decimal::new(pages as i64, 0);
		// cannot be negative and cannot be more than 100%
		percentage.clamp(Decimal::new(0, 0), Decimal::new(100, 0))
	}
}

async fn get_book_pages(book_id: String, conn: &impl ConnectionTrait) -> Result<i32> {
	let pages: i32 = media::Entity::find_by_id(book_id)
		.select_only()
		.column(media::Column::Pages)
		.into_tuple()
		.one(conn)
		.await?
		.ok_or("Media not found")?;
	Ok(pages)
}

pub fn calculate_logical_date(now: DateTime<Utc>, offset_hours: i32) -> NaiveDate {
	(now - Duration::hours(offset_hours as i64)).date_naive()
}

/// returns true if the given session should be extended rather than a new one created.
///
/// a session is extendable when:
/// - the book was not completed during it (`did_complete` is false)
/// - the time since the last update is within the user's configured grace period
pub fn should_extend_session(
	session: &reading_session_v2::Model,
	grace_period_secs: i64,
) -> bool {
	if session.is_finalized() {
		return false;
	}

	let secs_since_update = session
		.updated_at
		.map(|t| {
			let now: DateTime<Utc> = Utc::now();
			(now - t.with_timezone(&Utc)).num_seconds()
		})
		.unwrap_or(0);

	secs_since_update <= grace_period_secs
}

/// returns true if `session` was completed within `timeout_secs` of now
fn is_recent_completion(session: &reading_session_v2::Model, timeout_secs: i64) -> bool {
	if !session.is_finalized() {
		return false;
	}
	session
		.updated_at
		.map(|t| (Utc::now() - t.with_timezone(&Utc)).num_seconds() <= timeout_secs)
		.unwrap_or(false)
}

// TODO: tests would be sick but am not motivated enough for it rn

/// creates a [`reading_session_v2`] record or extends the most recent one if it falls within
/// the same logical day and the grace period has not elapsed
pub async fn upsert_reading_session(
	db: &impl ConnectionTrait,
	user: &AuthUser,
	media_id: &str,
	input: NormalizedProgression,
	completion_dedup_timeout_secs: i64,
) -> Result<reading_session_v2::Model, sea_orm::DbErr> {
	let (grace_period, day_reset_offset) = user
		.preferences
		.as_ref()
		.map(|p| (p.reading_session_grace_period_secs, p.day_reset_hour_offset))
		.unwrap_or((1800, 0));

	let logical_today = calculate_logical_date(Utc::now(), day_reset_offset);

	let latest =
		reading_session_v2::Entity::find_latest_for_user_and_media(user, media_id)
			.one(db)
			.await?;

	match latest {
		Some(ref session)
			if input.did_complete
				&& is_recent_completion(session, completion_dedup_timeout_secs) =>
		{
			return Ok(latest.unwrap());
		},
		Some(session)
			if session.session_date == logical_today
				&& should_extend_session(&session, grace_period) =>
		{
			let new_elapsed = session.elapsed_seconds.unwrap_or(0)
				+ input.elapsed_seconds_delta.unwrap_or(0).max(0);

			let mut active: reading_session_v2::ActiveModel = session.into();
			active.epubcfi = Set(input.epubcfi);
			active.end_page = Set(input.page);
			active.end_locator = Set(input.locator);
			active.end_percentage = Set(input.percentage);
			active.elapsed_seconds = Set(Some(new_elapsed));
			if input.did_complete {
				active.status = Set(ReadingStatus::Finished);
			}
			if let Some(incoming) = input.device_id {
				let current = match &active.device_ids {
					sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => {
						v.as_ref()
					},
					sea_orm::ActiveValue::NotSet => None,
				};
				let mut ids = current
					.map(|reading_session_v2::DeviceIds(v)| v.clone())
					.unwrap_or_default();
				if !ids.contains(&incoming) {
					ids.push(incoming);
					active.device_ids = Set(Some(reading_session_v2::DeviceIds(ids)));
				}
			}
			active.update(db).await
		},
		_ => {
			let readthrough_number =
				derive_readthrough_number(db, &user.id, media_id).await?;

			reading_session_v2::ActiveModel {
				session_date: Set(logical_today),
				epubcfi: Set(input.epubcfi),
				start_page: Set(input.page),
				end_page: Set(input.page),
				start_locator: Set(input.locator.clone()),
				end_locator: Set(input.locator),
				start_percentage: Set(input.percentage),
				end_percentage: Set(input.percentage),
				// set bc there's no existing session to extend
				elapsed_seconds: Set(Some(
					input.elapsed_seconds_delta.unwrap_or(0).max(0),
				)),
				readthrough_number: Set(readthrough_number),
				status: Set(if input.did_complete {
					ReadingStatus::Finished
				} else {
					ReadingStatus::Reading
				}),
				device_ids: Set(input
					.device_id
					.map(|id| reading_session_v2::DeviceIds(vec![id]))),
				media_id: Set(media_id.to_string()),
				user_id: Set(user.id.clone()),
				..Default::default()
			}
			.insert(db)
			.await
		},
	}
}

/// derives the readthrough number to assign to a new session for a given user+media pair
pub async fn derive_readthrough_number(
	db: &impl ConnectionTrait,
	user_id: &str,
	media_id: &str,
) -> Result<i32, sea_orm::DbErr> {
	let latest = reading_session_v2::Entity::find()
		.filter(reading_session_v2::Column::UserId.eq(user_id))
		.filter(reading_session_v2::Column::MediaId.eq(media_id))
		.order_by_desc(reading_session_v2::Column::CreatedAt)
		.one(db)
		.await?;

	Ok(match latest {
		// no existing session = first read
		None => 1,
		// existing session that was completed/dnf = increment readthrough number, new readthrough
		Some(session) if session.is_finalized() => session.readthrough_number + 1,
		Some(session) => session.readthrough_number,
	})
}

#[cfg(test)]
mod tests {
	use super::*;
	use chrono::TimeZone;

	#[test]
	fn test_logical_date_zero_offset() {
		// no offset: logical date == calendar date
		let now = Utc.with_ymd_and_hms(2026, 5, 17, 23, 0, 0).unwrap();
		assert_eq!(
			calculate_logical_date(now, 0),
			NaiveDate::from_ymd_opt(2026, 5, 17).unwrap()
		);
	}

	#[test]
	fn test_logical_date_within_offset_window() {
		// offset = 2, time = 1:30am -> logical time is 11:30pm the day before
		let now = Utc.with_ymd_and_hms(2026, 5, 17, 1, 30, 0).unwrap();
		assert_eq!(
			calculate_logical_date(now, 2),
			NaiveDate::from_ymd_opt(2026, 5, 16).unwrap()
		);
	}

	#[test]
	fn test_logical_date_past_offset_window() {
		// offset = 2, time = 2:30am -> logical time is 12:30am, same calendar day
		let now = Utc.with_ymd_and_hms(2026, 5, 17, 2, 30, 0).unwrap();
		assert_eq!(
			calculate_logical_date(now, 2),
			NaiveDate::from_ymd_opt(2026, 5, 17).unwrap()
		);
	}

	// TODO: move to central db testing helpers?
	fn make_session(
		did_complete: bool,
		updated_at_secs_ago: Option<i64>,
	) -> reading_session_v2::Model {
		let updated_at = updated_at_secs_ago.map(|secs| {
			let t = Utc::now() - Duration::seconds(secs);
			t.fixed_offset()
		});

		reading_session_v2::Model {
			id: 1,
			session_date: NaiveDate::from_ymd_opt(2026, 5, 17).unwrap(),
			epubcfi: None,
			start_locator: None,
			end_locator: None,
			start_page: None,
			end_page: None,
			start_percentage: None,
			end_percentage: None,
			koreader_progress: None,
			elapsed_seconds: None,
			readthrough_number: 1,
			status: if did_complete {
				ReadingStatus::Finished
			} else {
				ReadingStatus::Reading
			},
			notes: None,
			device_ids: None,
			media_id: "m1".to_string(),
			user_id: "u1".to_string(),
			created_at: Utc::now().fixed_offset(),
			updated_at,
		}
	}

	#[test]
	fn test_should_extend_not_completed_within_grace() {
		let session = make_session(false, Some(300)); // 5 min ago
		assert!(should_extend_session(&session, 600));
	}

	#[test]
	fn test_should_extend_grace_expired() {
		let session = make_session(false, Some(700)); // 11+ min ago
		assert!(!should_extend_session(&session, 600));
	}

	#[test]
	fn test_should_extend_completed_session() {
		let session = make_session(true, Some(10)); // recently updated but complete
		assert!(!should_extend_session(&session, 600));
	}

	#[test]
	fn test_should_extend_no_updated_at() {
		let session = make_session(false, None);
		assert!(should_extend_session(&session, 600));
	}
}
