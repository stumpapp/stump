use axum::{middleware::from_extractor_with_state, routing::get, Json, Router};
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::chrono::{DateTime, Utc};
use std::fs::File;
use stump_core::{config::logging::get_log_file, db::models::LogMetadata};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::get_session_admin_user,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/logs", get(get_logs).delete(clear_logs))
		.route("/logs/info", get(get_logfile_info))
		// FIXME: admin middleware
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

// TODO: there is a database entity Log. If that stays, I should differenciate between
// the stump.log file operations and the database operations better in this file. For now,
// I'm just going to leave it as is.

#[utoipa::path(
	get,
	path = "/api/v1/logs",
	tag = "log",
	responses(
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all logs from the database.
async fn get_logs() -> ApiResult<()> {
	// TODO: implement
	Err(ApiError::NotImplemented)
}

#[utoipa::path(
	get,
	path = "/api/v1/logs/info",
	tag = "log",
	responses(
		(status = 200, description = "Successfully retrieved log info", body = LogMetadata),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
async fn get_logfile_info(session: ReadableSession) -> ApiResult<Json<LogMetadata>> {
	get_session_admin_user(&session)?;
	let log_file_path = get_log_file();

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

#[utoipa::path(
	delete,
	path = "/api/v1/logs",
	tag = "log",
	responses(
		(status = 200, description = "Successfully cleared logs."),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Clear the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default.
// Note: I think it is important to point out that this `delete` actually creates
// a resource. This is not semantically correct, but I want it to be clear that
// this route *WILL* delete all of the file contents.
// #[delete("/logs")]
async fn clear_logs(session: ReadableSession) -> ApiResult<()> {
	get_session_admin_user(&session)?;
	let log_file_path = get_log_file();

	File::create(log_file_path.as_path())?;

	Ok(())
}
