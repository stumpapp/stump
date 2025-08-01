use chrono::{DateTime, Utc};

use crate::errors::{APIError, APIResult};

/// Gets the current UTC time as a DateTime<Utc>. If the current environment is a test, this
/// function will use [`tokio::time::Instant`] and calculate the current time from that. Ensure
/// you are running the test within a tokio runtime with the `start_paused = true` annotation.
///
/// See https://docs.rs/tokio/latest/tokio/time/fn.pause.html
pub fn current_utc_time() -> DateTime<Utc> {
	if cfg!(test) {
		// This is a hack to make tests deterministic
		let instant = tokio::time::Instant::now();
		let duration_since_epoch = instant.duration_since(instant);
		let system_time = std::time::UNIX_EPOCH + duration_since_epoch;
		system_time.into()
	} else {
		Utc::now()
	}
}

/// Attempts to parse a date from a string.
pub fn string_to_date(date: String) -> APIResult<DateTime<Utc>> {
	DateTime::parse_from_rfc3339(&date)
		.map(|dt| dt.with_timezone(&Utc))
		.map_err(|error| APIError::BadRequest(error.to_string()))
}

/// Attempts to parse a date from a string, returning the current UTC date if it fails.
pub fn safe_string_to_date(date: String) -> DateTime<Utc> {
	string_to_date(date).unwrap_or_else(|error| {
		tracing::error!(?error, "Failed to parse date");
		Utc::now()
	})
}

#[cfg(test)]
mod tests {
	use super::*;

	#[tokio::test(start_paused = true)]
	async fn test_current_utc_time() {
		let now = current_utc_time();
		// sleep for 1 second to ensure the time has "changed"
		tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
		let new_now = current_utc_time();
		assert_eq!(new_now.timestamp(), now.timestamp());
	}

	#[test]
	fn test_string_to_date() {
		let date = "2021-01-01T00:00:00Z".to_string();
		let result = string_to_date(date);
		assert!(result.is_ok());
	}

	#[test]
	fn test_string_to_date_invalid() {
		let date = "2021-01-01T00:00:00".to_string();
		let result = string_to_date(date);
		assert!(result.is_err());
	}

	#[test]
	fn test_safe_string_to_date() {
		let date = "2021-01-01T00:00:00Z".to_string();
		let result = safe_string_to_date(date);
		assert!(result.timestamp() > 0);
	}

	#[test]
	fn test_safe_string_to_date_invalid() {
		let date = "2021-01-01T00:00:00".to_string();
		let result = safe_string_to_date(date);
		assert!(result.timestamp() > 0);
	}
}
