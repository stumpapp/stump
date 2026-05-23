use chrono::{DateTime, Duration, NaiveDate, Utc};
use sea_orm::sqlx::types::Decimal;

use crate::entity::reading_session;

pub fn calculate_logical_date(now: DateTime<Utc>, offset_hours: i32) -> NaiveDate {
	(now - Duration::hours(offset_hours as i64)).date_naive()
}

/// returns true if the given session should be extended rather than a new one created.
///
/// a session is extendable when:
/// - the book was not completed during it (`did_complete` is false)
/// - the time since the last update is within the user's configured grace period
pub fn should_extend_session(
	session: &reading_session::Model,
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
pub fn is_recent_completion(session: &reading_session::Model, timeout_secs: i64) -> bool {
	if !session.is_finalized() {
		return false;
	}
	session
		.updated_at
		.map(|t| (Utc::now() - t.with_timezone(&Utc)).num_seconds() <= timeout_secs)
		.unwrap_or(false)
}

pub fn compute_page_based_percentage(current_page: i32, pages: i32) -> Decimal {
	if pages <= 0 {
		Decimal::new(0, 0)
	} else {
		let percentage =
			Decimal::new(current_page as i64, 0) / Decimal::new(pages as i64, 0);
		// cannot be negative and cannot be more than 100%
		percentage.clamp(Decimal::new(0, 0), Decimal::new(100, 0))
	}
}

#[cfg(test)]
mod tests {
	use crate::shared::enums::ReadingStatus;

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
	) -> reading_session::Model {
		let updated_at = updated_at_secs_ago.map(|secs| {
			let t = Utc::now() - Duration::seconds(secs);
			t.fixed_offset()
		});

		reading_session::Model {
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
