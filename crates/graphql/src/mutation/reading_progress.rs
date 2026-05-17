// TODO: move existing reading progress mutations here (mark_media_as_complete)

use async_graphql::{Context, Object, Result, ID};
use chrono::{DateTime, Duration, NaiveDate, Utc};
use models::{
	entity::{reading_session_v2, user::AuthUser},
	shared::readium::ReadiumLocator,
};
use sea_orm::{
	prelude::Decimal, ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait,
	EntityTrait, QueryFilter, QueryOrder,
};

use crate::{
	data::{AuthContext, CoreContext},
	input::media::MediaProgressInput,
	mutation::media::{compute_page_based_percentage, get_book_pages},
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
}

/// normalized porgression info derived from a [`MediaProgressInput`]
pub struct NormalizedProgression {
	pub page: Option<i32>,
	pub locator: Option<ReadiumLocator>,
	pub epubcfi: Option<String>,
	pub percentage: Option<Decimal>,
	pub elapsed_seconds_delta: Option<i64>,
	pub did_complete: bool,
	pub device_id: Option<String>,
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
	if session.did_complete {
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
		.unwrap_or((600, 0));

	let logical_today = calculate_logical_date(Utc::now(), day_reset_offset);

	let latest =
		reading_session_v2::Entity::find_latest_for_user_and_media(user, media_id)
			.one(db)
			.await?;

	match latest {
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
				active.did_complete = Set(true);
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
			// TODO: port the v1 completion_dedup_timeout_secs stuff later, ran out of time for now
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
				// fixme: not right? think through
				elapsed_seconds: Set(Some(
					input.elapsed_seconds_delta.unwrap_or(0).max(0),
				)),
				readthrough_number: Set(readthrough_number),
				did_complete: Set(input.did_complete),
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
		// existing session that was completed = increment readthrough number, new readthrough
		Some(session) if session.did_complete => session.readthrough_number + 1,
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
			did_complete,
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
