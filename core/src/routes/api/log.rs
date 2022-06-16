use std::fs::File;

use prisma_client_rust::chrono::{DateTime, Utc};
use rocket::serde::json::Json;
use rocket_okapi::openapi;

use crate::{
	config::get_config_dir,
	guards::auth::AdminGuard,
	types::{alias::ApiResult, errors::ApiError, models::log::LogMetadata},
};

// TODO: there is a database entity Log. If that stays, I should differenciate between
// the stump.log file operations and the database operations better in this file. For now,
// I'm just going to leave it as is.

/// Get information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
#[openapi(tag = "Logs")]
#[get("/logs")]
pub async fn get_log_info(_auth: AdminGuard) -> ApiResult<Json<LogMetadata>> {
	let log_file_path = get_config_dir().join("stump.log");

	let file = File::open(log_file_path.as_path())?;

	let metadata = file.metadata()?;

	let system_time = metadata.modified()?;

	let datetime: DateTime<Utc> = system_time.into();

	Ok(Json(LogMetadata {
		path: log_file_path,
		size: metadata.len(),
		modified: datetime.format("%m/%d/%Y %T").to_string(),
	}))
}

/// Clear the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default.
// Note: I think it is important to point out that this `delete` actually creates
// a resource. This is not semantically correct, but I want it to be clear that
// this route *WILL* delete all of the file contents.
#[openapi(tag = "Logs")]
#[delete("/logs")]
pub async fn clear_logs(_auth: AdminGuard) -> Result<(), ApiError> {
	let log_file_path = get_config_dir().join("stump.log");

	File::create(log_file_path.as_path())?;

	Ok(())
}
