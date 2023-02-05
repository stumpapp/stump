use axum::{middleware::from_extractor_with_state, routing::get, Json, Router};
use axum_sessions::extractors::ReadableSession;
use prisma_client_rust::chrono::{DateTime, Utc};
use std::fs::File;
use stump_core::{config::logging::get_log_file, db::models::LogMetadata};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	utils::get_session_user,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/logs", get(get_log_info).delete(clear_logs))
		// FIXME: admin middleware
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

// TODO: there is a database entity Log. If that stays, I should differenciate between
// the stump.log file operations and the database operations better in this file. For now,
// I'm just going to leave it as is.

/// Get information about the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default. Information such as the file size, last modified date, etc.
// #[get("/logs")]
async fn get_log_info(session: ReadableSession) -> ApiResult<Json<LogMetadata>> {
	let user = get_session_user(&session)?;

	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You must be an admin to access this resource.".into(),
		));
	}

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

/// Clear the Stump log file, located at STUMP_CONFIG_DIR/Stump.log, or
/// ~/.stump/Stump.log by default.
// Note: I think it is important to point out that this `delete` actually creates
// a resource. This is not semantically correct, but I want it to be clear that
// this route *WILL* delete all of the file contents.
// #[delete("/logs")]
async fn clear_logs(session: ReadableSession) -> ApiResult<()> {
	let user = get_session_user(&session)?;

	if !user.is_admin() {
		return Err(ApiError::Forbidden(
			"You must be an admin to access this resource.".into(),
		));
	}

	let log_file_path = get_log_file();

	File::create(log_file_path.as_path())?;

	Ok(())
}
