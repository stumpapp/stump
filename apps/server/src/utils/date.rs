use prisma_client_rust::chrono::{DateTime, Utc};

use crate::errors::{APIError, APIResult};

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
