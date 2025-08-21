use axum::{
	extract::State,
	middleware,
	response::{sse::Event, Sse},
	routing::get,
	Extension, Json, Router,
};
use futures_util::Stream;
use linemux::MuxedLines;
use prisma_client_rust::chrono::{DateTime, Utc};
use serde_qs::axum::QsQuery;
use std::fs::File;
use stump_core::{
	db::{
		entity::{Log, LogMetadata, UserPermission},
		query::{
			ordering::QueryOrder,
			pagination::{Pageable, Pagination, PaginationQuery},
		},
	},
	prisma::log::{self, OrderByParam as LogOrderByParam, WhereParam},
};

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::{chain_optional_iter, LogFilter},
	middleware::auth::{auth_middleware, AuthContext},
	routers::sse::stream_shutdown_guard,
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.route("/logs", get(get_logs).delete(delete_logs))
		.nest(
			"/logs/file",
			Router::new()
				.route("/", get(delete_log_file))
				.route("/info", get(get_logfile_info))
				.route("/tail", get(tail_log_file)),
		)
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

pub(crate) fn apply_log_filters(filters: LogFilter) -> Vec<WhereParam> {
	chain_optional_iter(
		[],
		[
			filters
				.level
				.map(|level| log::level::equals(level.to_string())),
			filters
				.job_id
				.map(|job_id| log::job_id::equals(Some(job_id))),
		],
	)
}

#[utoipa::path(
	get,
	path = "/api/v1/logs",
	tag = "log",
	responses(
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all logs from the database.
async fn get_logs(
	State(ctx): State<AppState>,
	filters: QsQuery<LogFilter>,
	order: QsQuery<QueryOrder>,
	pagination: QsQuery<PaginationQuery>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Json<Pageable<Vec<Log>>>> {
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	let pagination = pagination.0.get();
	let order = order.0;
	tracing::trace!(?pagination, ?order, "get_logs");

	let db = &ctx.db;
	let is_unpaged = pagination.is_unpaged();
	let order_by_param: LogOrderByParam = order.try_into()?;

	let pagination_cloned = pagination.clone();
	let where_params = apply_log_filters(filters.0);

	let (logs, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client
				.log()
				.find_many(where_params.clone())
				.order_by(order_by_param);

			if !is_unpaged {
				match pagination_cloned {
					Pagination::Page(page_query) => {
						let (skip, take) = page_query.get_skip_take();
						query = query.skip(skip).take(take);
					},
					Pagination::Cursor(cursor_query) => {
						// TODO: handle this better
						if let Some(Ok(cursor)) = cursor_query.cursor.map(|c| c.parse()) {
							query = query.cursor(log::id::equals(cursor)).skip(1);
						}
						if let Some(limit) = cursor_query.limit {
							query = query.take(limit);
						}
					},
					_ => unreachable!(),
				}
			}

			let logs = query
				.exec()
				.await?
				.into_iter()
				.map(Log::from)
				.collect::<Vec<_>>();

			if is_unpaged {
				return Ok((logs, None));
			}

			client
				.log()
				.count(where_params)
				.exec()
				.await
				.map(|count| (logs, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((logs, count, pagination))));
	}

	Ok(Json(Pageable::from(logs)))
}

#[utoipa::path(
	delete,
	path = "/api/v1/logs",
	tag = "log",
	responses(
		(status = 200, description = "Successfully deleted logs."),
		(status = 401, description = "Unauthorized."),
		(status = 403, description = "Forbidden."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn delete_logs(
	State(ctx): State<AppState>,
	filters: QsQuery<LogFilter>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<()> {
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	let where_params = apply_log_filters(filters.0);

	let affected_records = ctx.db.log().delete_many(where_params).exec().await?;
	tracing::debug!(affected_records, "Deleted logs");

	Ok(())
}

async fn tail_log_file(
	State(ctx): State<AppState>,
	Extension(req): Extension<AuthContext>,
) -> APIResult<Sse<impl Stream<Item = Result<Event, APIError>>>> {
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	let stream = async_stream::stream! {
		let log_file_path = ctx.config.get_log_file();
		let mut lines = MuxedLines::new()?;
		lines.add_file(log_file_path.as_path()).await?;

		loop {
			if let Ok(Some(line)) = lines.next_line().await {
				yield Ok(
					Event::default()
						.json_data(line.line())
						.map_err(|e| APIError::InternalServerError(e.to_string()))?
				);
			}
		}
	};

	let guarded_stream = stream_shutdown_guard(stream);

	Ok(Sse::new(guarded_stream))
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
async fn get_logfile_info(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
) -> APIResult<Json<LogMetadata>> {
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	let log_file_path = ctx.config.get_log_file();

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
async fn delete_log_file(
	Extension(req): Extension<AuthContext>,
	State(ctx): State<AppState>,
) -> APIResult<()> {
	req.enforce_permissions(&[UserPermission::ManageServer])?;

	let log_file_path = ctx.config.get_log_file();

	File::create(log_file_path.as_path())?;

	Ok(())
}
