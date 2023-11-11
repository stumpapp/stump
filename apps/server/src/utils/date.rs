use prisma_client_rust::chrono::{DateTime, Utc};

use crate::errors::{ApiError, ApiResult};

/// Attempts to parse a date from a string.
pub fn string_to_date(date: String) -> ApiResult<DateTime<Utc>> {
	DateTime::parse_from_rfc3339(&date)
		.map(|dt| dt.with_timezone(&Utc))
		.map_err(|error| ApiError::BadRequest(error.to_string()))
}

/// Attempts to parse a date from a string, returning the current UTC date if it fails.
pub fn safe_string_to_date(date: String) -> DateTime<Utc> {
	string_to_date(date).unwrap_or_else(|error| {
		tracing::error!(?error, "Failed to parse date");
		Utc::now()
	})
}
