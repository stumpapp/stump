use async_graphql::{InputObject, OneofObject};
use models::shared::enums::MetadataFetchStatus;
use serde::Serialize;

/// A oneOf input for the schedule config
#[derive(OneofObject, Serialize)]
#[serde(tag = "config_type")]
pub enum ScheduledJobConfigInput {
	LibraryScan(LibraryScanConfigInput),
	MetadataRetry(MetadataRetryConfigInput),
}

#[derive(InputObject, Serialize)]
pub struct LibraryScanConfigInput {
	/// Library IDs to scan. An empty list means "all libraries"
	pub library_ids: Vec<String>,
}

#[derive(InputObject, Serialize)]
pub struct MetadataRetryConfigInput {
	/// Which metadata fetch statuses to retry (e.g. RATE_LIMITED, FAILED)
	pub statuses: Vec<MetadataFetchStatus>,
}

#[derive(InputObject)]
pub struct CreateScheduledJobInput {
	pub name: String,
	/// A cron expression (e.g. `0 0 * * *` for daily at midnight)
	pub schedule: String,
	/// The type-specific config. The kind is inferred from the variant provided
	pub config: ScheduledJobConfigInput,
	/// Whether the job is enabled. Defaults to `true`
	pub enabled: Option<bool>,
}

#[derive(InputObject)]
pub struct UpdateScheduledJobInput {
	pub name: Option<String>,
	/// A cron expression
	pub schedule: Option<String>,
	/// Replace the config entirely. The kind is inferred from the variant
	pub config: Option<ScheduledJobConfigInput>,
	pub enabled: Option<bool>,
}

/// Validate a scheduled job input, returning an error string if invalid
pub fn validate_create_input(input: &CreateScheduledJobInput) -> Result<(), String> {
	if input.name.trim().is_empty() {
		return Err("name must not be empty".to_string());
	}

	validate_cron_expression(&input.schedule)
}

pub fn validate_cron_expression(expr: &str) -> Result<(), String> {
	use std::str::FromStr;
	cron::Schedule::from_str(expr)
		.map(|_| ())
		.map_err(|e| format!("Invalid cron expression: {e}"))
}
