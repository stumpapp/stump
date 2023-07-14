use axum::{
	middleware::from_extractor_with_state,
	response::{sse::Event, Sse},
	routing::get,
	Json, Router,
};
use axum_sessions::extractors::ReadableSession;
use futures_util::Stream;
use notify::{EventKind, RecursiveMode, Watcher};
use prisma_client_rust::chrono::{DateTime, Utc};
use std::{
	convert::Infallible,
	fs::File,
	io::{Read, Seek, SeekFrom},
};
use stump_core::{config::logging::get_log_file, db::entity::LogMetadata};
use tokio::sync::broadcast;

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
	routers::sse::stream_shutdown_guard,
	utils::get_session_admin_user,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/logs", get(get_logs).delete(clear_logs))
		.route("/logs/info", get(get_logfile_info))
		.nest(
			"/logs/file",
			Router::new().route("/tail", get(tail_log_file)),
		)
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

// FIXME: so this is a cool POC, but it seems to only work with manual file edits. When the
// file appender for the log config writes to the file, notify is not picking it up. I'm not
// sure if this is a result of the recommended_watcher defaults, or perhaps something about how
// the file appender works. I'm going to leave this here for now, as its a cool to have.
async fn tail_log_file() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
	let stream = async_stream::stream! {
		let log_file_path = get_log_file();
		let mut file = File::open(log_file_path.as_path()).expect("Failed to open log file");
		let file_length = file
			.seek(SeekFrom::End(0))
			.expect("Failed to seek to end of log file");
		file.seek(SeekFrom::Start(file_length))
			.expect("Failed to seek to end of log file");

		println!("file path: {}", log_file_path.as_path().display());
		println!("file_length: {}", file_length);

		let (tx, mut rx) = broadcast::channel::<String>(100);

		let mut watcher =
			notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
				match res {
					Ok(event) => {
						println!("event: {:?}", event);
						match event.kind {
							EventKind::Modify(_) => {
								let mut content = String::new();
								file.read_to_string(&mut content).unwrap();
								for line in content.lines().rev() {
									println!("line: {}", line);
									if !line.is_empty() {
										if tx.send(line.to_owned()).is_err() {
											break;
										}
									}
								}
							},
							_ => {},
						}
					},
					Err(e) => println!("watch error: {:?}", e),
				}
			})
			.expect("watcher failed");

		watcher
		.watch(log_file_path.as_path(), RecursiveMode::NonRecursive)
		.expect("watch failed");

		loop {
			if let Ok(msg) = rx.recv().await {
				println!("msg: {}", msg);
				yield Ok(Event::default().json_data(msg).expect("Failed to create event"));
			} else {
				continue;
			}
		}
	};

	let guarded_stream = stream_shutdown_guard(stream);

	Sse::new(guarded_stream)
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
