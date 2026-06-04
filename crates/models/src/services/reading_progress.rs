use chrono::Utc;
use sea_orm::{
	prelude::Decimal, ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait,
	EntityTrait, QueryFilter, QueryOrder, QuerySelect,
};

use crate::{
	domain::reading_progress::{
		calculate_logical_date, is_recent_completion, should_extend_session,
	},
	entity::{media, reading_session, user::AuthUser},
	shared::{enums::ReadingStatus, readium::ReadiumLocator},
};

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

/// creates a [`reading_session`] record or extends the most recent one if it falls within
/// the same logical day and the grace period has not elapsed
pub async fn upsert_reading_session(
	db: &impl ConnectionTrait,
	user: &AuthUser,
	media_id: &str,
	input: NormalizedProgression,
	completion_dedup_timeout_secs: i64,
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

	match latest {
		// TODO(reading-sessions): this presents an interesting ux smell imo. once you finish a session,
		// the next progression tracking event (e.g., jumping back 10 pages before the end) will create
		// a new session and increment the readthrough number. it will not let you finish that readthrough
		// until you mark as complete or the deduplication window passes (e.g., 1 day by default). im thinking
		// one of two things would be better:
		// 1. increment the readthrough to continue tracking progress (the current fix in this branch)
		// 2. mutate the finished session as incomplete if within the dedupe window to be active instead
		// the first was easier which is why i did it, however second might be better. need to properly review
		// how it would impact the tracking though so will come back when i have more time.
		Some(ref session)
			if input.did_complete
				&& should_enforce_completion_dedupe(
					session,
					completion_dedup_timeout_secs,
					db,
				)
				.await? =>
		{
			Ok(latest.unwrap())
		},
		Some(session)
			if session.session_date == logical_today
				&& should_extend_session(&session, grace_period) =>
		{
			let new_elapsed = session.elapsed_seconds.unwrap_or(0)
				+ input.elapsed_seconds_delta.unwrap_or(0).max(0);

			let mut active: reading_session::ActiveModel = session.into();
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
					.map(|reading_session::DeviceIds(v)| v.clone())
					.unwrap_or_default();
				if !ids.contains(&incoming) {
					ids.push(incoming);
					active.device_ids = Set(Some(reading_session::DeviceIds(ids)));
				}
			}
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
					.map(|id| reading_session::DeviceIds(vec![id]))),
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

// note this makes certain assumptions that feel incorrect but i only use it when
// gated by input.is_complete so it's fine
async fn should_enforce_completion_dedupe(
	session: &reading_session::Model,
	timeout_secs: i64,
	conn: &impl ConnectionTrait,
) -> Result<bool, sea_orm::DbErr> {
	let latest_completed = reading_session::Entity::find()
		.filter(
			reading_session::Column::UserId
				.eq(&session.user_id)
				.and(reading_session::Column::MediaId.eq(&session.media_id)),
		)
		.filter(reading_session::Column::Status.eq(ReadingStatus::Finished))
		.order_by_desc(reading_session::Column::UpdatedAt)
		.one(conn)
		.await?;

	Ok(latest_completed
		.filter(|s| is_recent_completion(s, timeout_secs))
		.is_some())
}
