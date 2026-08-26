use std::collections::HashMap;

use chrono::Utc;
use sea_orm::{
	prelude::{DateTimeWithTimeZone, Decimal},
	sea_query::OnConflict,
	ActiveModelTrait,
	ActiveValue::Set,
	ColumnTrait, ConnectionTrait, EntityTrait, IntoActiveModel, QueryFilter, QueryOrder,
	QuerySelect,
};

use crate::{
	domain::reading_progress::{
		calculate_logical_date, next_sync_timestamp, should_extend_session,
	},
	entity::{media, reading_progress_reset, reading_session, user::AuthUser},
	shared::{enums::ReadingStatus, readium::ReadiumLocator},
};

#[derive(Debug)]
pub struct ReadingProgressReset {
	pub had_session: bool,
	pub removed_sessions: u64,
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
	pub reported_at: Option<DateTimeWithTimeZone>,
}

impl NormalizedProgression {
	fn apply(&self, session: reading_session::Model) -> reading_session::ActiveModel {
		let new_elapsed = session.elapsed_seconds.unwrap_or(0)
			+ self.elapsed_seconds_delta.unwrap_or(0).max(0);

		let mut active = session.into_active_model();

		active.epubcfi = Set(self.epubcfi.clone());
		active.end_page = Set(self.page);
		active.end_locator = Set(self.locator.clone());
		active.end_percentage = Set(self.percentage);
		if self.did_complete {
			active.status = Set(ReadingStatus::Finished);
		} else {
			active.status = Set(ReadingStatus::Reading);
		}
		active.elapsed_seconds = Set(Some(new_elapsed));
		active.reported_at = Set(self.reported_at.to_owned());
		if let Some(incoming) = &self.device_id {
			let current = match &active.device_ids {
				sea_orm::ActiveValue::Set(v) | sea_orm::ActiveValue::Unchanged(v) => {
					v.as_ref()
				},
				sea_orm::ActiveValue::NotSet => None,
			};
			let mut ids = current
				.map(|reading_session::DeviceIds(v)| v.clone())
				.unwrap_or_default();
			if !ids.contains(incoming) {
				ids.push(incoming.clone());
				active.device_ids = Set(Some(reading_session::DeviceIds(ids)));
			}
		}
		active
	}
}

/// creates a [`reading_session`] record or extends the most recent one if it falls within
/// the same logical day and the grace period has not elapsed
pub async fn upsert_reading_session(
	db: &impl ConnectionTrait,
	user: &AuthUser,
	media_id: &str,
	input: NormalizedProgression,
) -> Result<reading_session::Model, sea_orm::DbErr> {
	let (grace_period, day_reset_offset) = user
		.preferences
		.as_ref()
		.map(|p| (p.reading_session_grace_period_secs, p.day_reset_hour_offset))
		.unwrap_or((1800, 0));

	let logical_today = calculate_logical_date(Utc::now(), day_reset_offset);

	let latest = reading_session::Entity::find_latest_for_user_and_media(user, media_id)
		.one(db)
		.await?;
	let was_reset =
		is_reading_progress_reset(db, &user.id, media_id, latest.as_ref()).await?;

	match latest {
		// so long as the status is no dnf, progression within grace period will extend the existing session.
		// this might re-open the session if it was previously marked as finished
		Some(session)
			if !was_reset
				&& session.session_date == logical_today
				&& should_extend_session(&session, grace_period) =>
		{
			let active = input.apply(session);
			active.update(db).await
		},
		_ => {
			let readthrough_number =
				derive_readthrough_number(db, &user.id, media_id).await?;

			reading_session::ActiveModel {
				session_date: Set(logical_today),
				epubcfi: Set(input.epubcfi),
				start_page: Set(input.page),
				end_page: Set(input.page),
				start_locator: Set(input.locator.clone()),
				end_locator: Set(input.locator),
				start_percentage: Set(input.percentage.or(Some(Decimal::new(0, 2)))),
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
					.map(|id| reading_session::DeviceIds(vec![id]))),
				reported_at: Set(input.reported_at),
				media_id: Set(media_id.to_string()),
				user_id: Set(user.id.clone()),
				..Default::default()
			}
			.insert(db)
			.await
		},
	}
}

async fn mark_reading_progress_reset_at(
	db: &impl ConnectionTrait,
	user_id: &str,
	media_id: &str,
	reset_at: DateTimeWithTimeZone,
	reported_at: Option<DateTimeWithTimeZone>,
	reported_at_floor: Option<DateTimeWithTimeZone>,
) -> Result<DateTimeWithTimeZone, sea_orm::DbErr> {
	let effective_reported_at =
		next_sync_timestamp(reported_at.unwrap_or(reset_at), reported_at_floor);
	persist_reading_progress_resets(
		db,
		user_id,
		reset_at,
		&[(media_id.to_string(), effective_reported_at)],
	)
	.await?;

	Ok(reset_at)
}

async fn persist_reading_progress_resets(
	db: &impl ConnectionTrait,
	user_id: &str,
	reset_at: DateTimeWithTimeZone,
	resets: &[(String, DateTimeWithTimeZone)],
) -> Result<(), sea_orm::DbErr> {
	if resets.is_empty() {
		return Ok(());
	}

	let media_ids = resets
		.iter()
		.map(|(media_id, _)| media_id.clone())
		.collect::<Vec<_>>();
	let previous_by_media = reading_progress_reset::Entity::find()
		.filter(reading_progress_reset::Column::UserId.eq(user_id))
		.filter(reading_progress_reset::Column::MediaId.is_in(media_ids))
		.all(db)
		.await?
		.into_iter()
		.map(|reset| (reset.media_id, reset.reported_at.unwrap_or(reset.reset_at)))
		.collect::<HashMap<_, _>>();

	let models = resets.iter().map(|(media_id, reported_at)| {
		let reported_at =
			next_sync_timestamp(*reported_at, previous_by_media.get(media_id).cloned());
		reading_progress_reset::ActiveModel {
			user_id: Set(user_id.to_string()),
			media_id: Set(media_id.clone()),
			reset_at: Set(reset_at),
			reported_at: Set(Some(reported_at)),
		}
	});

	reading_progress_reset::Entity::insert_many(models)
		.on_conflict(
			OnConflict::columns([
				reading_progress_reset::Column::UserId,
				reading_progress_reset::Column::MediaId,
			])
			.update_columns([
				reading_progress_reset::Column::ResetAt,
				reading_progress_reset::Column::ReportedAt,
			])
			.to_owned(),
		)
		.exec(db)
		.await?;

	Ok(())
}

pub fn reading_session_sync_timestamp(
	session: &reading_session::Model,
) -> DateTimeWithTimeZone {
	session
		.reported_at
		.unwrap_or(session.updated_at.unwrap_or(session.created_at))
}

/// Persists reset markers for several books with one insert/upsert statement.
///
/// Each timestamp is the outbound sync timestamp captured before the corresponding sessions were
/// deleted.
pub async fn mark_reading_progress_resets(
	db: &impl ConnectionTrait,
	user_id: &str,
	reset_floors: &[(String, DateTimeWithTimeZone)],
) -> Result<DateTimeWithTimeZone, sea_orm::DbErr> {
	let reset_at: DateTimeWithTimeZone = Utc::now().into();
	let resets = reset_floors
		.iter()
		.map(|(media_id, floor)| {
			(
				media_id.clone(),
				next_sync_timestamp(reset_at, Some(*floor)),
			)
		})
		.collect::<Vec<_>>();
	persist_reading_progress_resets(db, user_id, reset_at, &resets).await?;
	Ok(reset_at)
}

/// Records an explicit reset without deleting reading history.
///
/// The row is intentionally retained after later progress updates. Comparing its timestamp with
/// the latest session makes concurrent reset/update requests resolve by last write without a
/// race-prone delete.
pub async fn mark_reading_progress_reset(
	db: &impl ConnectionTrait,
	user_id: &str,
	media_id: &str,
) -> Result<DateTimeWithTimeZone, sea_orm::DbErr> {
	let latest = reading_session::Entity::find()
		.filter(reading_session::Column::UserId.eq(user_id))
		.filter(reading_session::Column::MediaId.eq(media_id))
		.order_by_desc(reading_session::Column::ReportedAt)
		.one(db)
		.await?;
	mark_reading_progress_reset_at(
		db,
		user_id,
		media_id,
		Utc::now().into(),
		None,
		latest.as_ref().map(reading_session_sync_timestamp),
	)
	.await
}

/// Clears the current readthrough and records a durable reset event.
///
/// Completed and abandoned sessions remain available as reading history. The reset marker is what
/// lets integrations observe the state change after the active session rows have been deleted.
async fn reset_reading_progress_inner(
	db: &impl ConnectionTrait,
	user: &AuthUser,
	media_id: &str,
	reported_at: Option<DateTimeWithTimeZone>,
) -> Result<ReadingProgressReset, sea_orm::DbErr> {
	let latest = reading_session::Entity::find_latest_for_user_and_media(user, media_id)
		.one(db)
		.await?;
	let reported_at_floor = latest.as_ref().map(reading_session_sync_timestamp);

	let removed_sessions = if let Some(session) = latest.as_ref() {
		reading_session::Entity::delete_many()
			.filter(reading_session::Column::UserId.eq(&user.id))
			.filter(reading_session::Column::MediaId.eq(media_id))
			.filter(
				reading_session::Column::ReadthroughNumber.eq(session.readthrough_number),
			)
			.filter(reading_session::Column::Status.eq(ReadingStatus::Reading))
			.exec(db)
			.await?
			.rows_affected
	} else {
		0
	};

	mark_reading_progress_reset_at(
		db,
		&user.id,
		media_id,
		Utc::now().into(),
		reported_at,
		reported_at_floor,
	)
	.await?;

	Ok(ReadingProgressReset {
		had_session: latest.is_some(),
		removed_sessions,
	})
}

pub async fn reset_reading_progress_with_reported_at(
	db: &impl ConnectionTrait,
	user: &AuthUser,
	media_id: &str,
	reported_at: DateTimeWithTimeZone,
) -> Result<ReadingProgressReset, sea_orm::DbErr> {
	reset_reading_progress_inner(db, user, media_id, Some(reported_at)).await
}

pub async fn reset_reading_progress(
	db: &impl ConnectionTrait,
	user: &AuthUser,
	media_id: &str,
) -> Result<ReadingProgressReset, sea_orm::DbErr> {
	reset_reading_progress_inner(db, user, media_id, None).await
}

/// Whether a reset is the most recent progression event for a book.
pub async fn is_reading_progress_reset(
	db: &impl ConnectionTrait,
	user_id: &str,
	media_id: &str,
	latest_session: Option<&reading_session::Model>,
) -> Result<bool, sea_orm::DbErr> {
	let reset = reading_progress_reset::Entity::find_by_id((
		user_id.to_string(),
		media_id.to_string(),
	))
	.one(db)
	.await?;

	Ok(reset.is_some_and(|reset| {
		latest_session.is_none_or(|session| {
			reset.reset_at >= session.updated_at.unwrap_or(session.created_at)
		})
	}))
}

/// derives the readthrough number to assign to a new session for a given user+media pair
pub async fn derive_readthrough_number(
	db: &impl ConnectionTrait,
	user_id: &str,
	media_id: &str,
) -> Result<i32, sea_orm::DbErr> {
	let latest = reading_session::Entity::find()
		.filter(reading_session::Column::UserId.eq(user_id))
		.filter(reading_session::Column::MediaId.eq(media_id))
		.order_by_desc(reading_session::Column::CreatedAt)
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

/// get the number of pages in a book
pub async fn get_book_pages(
	book_id: String,
	conn: &impl ConnectionTrait,
) -> Result<i32, sea_orm::DbErr> {
	let pages: i32 = media::Entity::find_by_id(book_id.clone())
		.select_only()
		.column(media::Column::Pages)
		.into_tuple()
		.one(conn)
		.await?
		.ok_or_else(|| {
			sea_orm::DbErr::RecordNotFound(format!("Media with id {} not found", book_id))
		})?;
	Ok(pages)
}
