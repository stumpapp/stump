use axum::{
	extract::{Path, Query, State},
	middleware,
	routing::{delete, get},
	Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_qs::axum::QsQuery;
use specta::Type;
use stump_core::{
	db::{
		entity::{JobSchedulerConfig, PersistedJob},
		query::{
			ordering::QueryOrder,
			pagination::{Pageable, Pagination, PaginationQuery},
		},
	},
	job::{AcknowledgeableCommand, JobControllerCommand},
	prisma::{
		job::{self, OrderByParam as JobOrderByParam},
		job_schedule_config, library, server_config,
	},
};
use tokio::sync::oneshot;
use utoipa::ToSchema;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
	filter::chain_optional_iter,
	middleware::auth::{auth_middleware, server_owner_middleware},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/jobs",
			Router::new()
				.route("/", get(get_jobs).delete(delete_jobs))
				.nest(
					"/:id",
					Router::new()
						.route("/", delete(delete_job_by_id))
						.route("/cancel", delete(cancel_job_by_id)),
				)
				.route(
					"/scheduler-config",
					get(get_scheduler_config).post(update_scheduler_config),
				),
		)
		// TODO: consider permissions around job management
		.layer(middleware::from_fn(server_owner_middleware))
		.layer(middleware::from_fn_with_state(app_state, auth_middleware))
}

#[derive(Deserialize, Serialize, ToSchema, Type)]
pub struct GetJobsParams {
	#[serde(default)]
	pub load_logs: bool,
}

// TODO: support filtering
#[utoipa::path(
	get,
	path = "/api/v1/jobs",
	tag = "job",
	responses(
		(status = 200, description = "Successfully retrieved job reports", body = [PersistedJob]),
		(status = 401, description = "No user is logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all running/pending jobs.
async fn get_jobs(
	order: QsQuery<QueryOrder>,
	pagination_query: Query<PaginationQuery>,
	relation_query: Query<GetJobsParams>,
	State(ctx): State<AppState>,
) -> APIResult<Json<Pageable<Vec<PersistedJob>>>> {
	let pagination = pagination_query.0.get();
	let order = order.0;
	let load_logs = relation_query.load_logs;

	tracing::trace!(load_logs, ?pagination, ?order, "get_jobs");

	let db = &ctx.db;
	let is_unpaged = pagination.is_unpaged();
	let order_by_param: JobOrderByParam = order.try_into()?;

	let pagination_cloned = pagination.clone();

	let (jobs, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client.job().find_many(vec![]).order_by(order_by_param);

			if load_logs {
				query = query.with(job::logs::fetch(vec![]));
			}

			if !is_unpaged {
				match pagination_cloned {
					Pagination::Page(page_query) => {
						let (skip, take) = page_query.get_skip_take();
						query = query.skip(skip).take(take);
					},
					Pagination::Cursor(cursor_query) => {
						if let Some(cursor) = cursor_query.cursor {
							query = query.cursor(job::id::equals(cursor)).skip(1)
						}
						if let Some(limit) = cursor_query.limit {
							query = query.take(limit)
						}
					},
					_ => unreachable!(),
				}
			}

			let jobs = query
				.exec()
				.await?
				.into_iter()
				.map(PersistedJob::from)
				.collect::<Vec<_>>();

			if is_unpaged {
				return Ok((jobs, None));
			}

			client
				.job()
				.count(vec![])
				.exec()
				.await
				.map(|count| (jobs, Some(count)))
		})
		.await?;

	if let Some(count) = count {
		return Ok(Json(Pageable::from((jobs, count, pagination))));
	}

	Ok(Json(Pageable::from(jobs)))
}

#[utoipa::path(
	delete,
	path = "/api/v1/jobs",
	tag = "job",
	responses(
		(status = 200, description = "Successfully deleted job reports"),
		(status = 401, description = "No user is logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Delete all jobs from the database.
async fn delete_jobs(State(ctx): State<AppState>) -> APIResult<()> {
	let result = ctx.db.job().delete_many(vec![]).exec().await?;
	tracing::debug!("Deleted {} job reports", result);
	Ok(())
}

#[utoipa::path(
	delete,
	path = "/api/v1/jobs/:id",
	tag = "job",
	responses(
		(status = 200, description = "Successfully deleted job"),
		(status = 401, description = "No user is logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Delete a job by its ID
async fn delete_job_by_id(
	State(ctx): State<AppState>,
	Path(job_id): Path<String>,
) -> APIResult<()> {
	let _ = ctx.db.job().delete(job::id::equals(job_id)).exec().await?;
	// TODO(aaron): debug why this breaks Axum...
	// Ok(PersistedJob::from(result))
	Ok(())
}

#[utoipa::path(
	delete,
	path = "/api/v1/jobs/:id/cancel",
	tag = "job",
	params(
		("id" = String, Path, description = "The ID of the job to cancel.")
	),
	responses(
		(status = 200, description = "Successfully cancelled job"),
		(status = 401, description = "No user is logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Cancel a running job. This will not delete the job report.
async fn cancel_job_by_id(
	State(ctx): State<AppState>,
	Path(job_id): Path<String>,
) -> APIResult<()> {
	let (task_tx, task_rx) = oneshot::channel();

	ctx.send_job_controller_command(JobControllerCommand::CancelJob(
		AcknowledgeableCommand {
			id: job_id,
			ack: task_tx,
		},
	))
	.map_err(|e| {
		APIError::InternalServerError(format!(
			"Failed to send command to job manager: {}",
			e
		))
	})?;

	Ok(task_rx.await.map_err(|e| {
		APIError::InternalServerError(format!("Failed to get cancel confirmation: {}", e))
	})??)
}

#[utoipa::path(
	get,
	path = "/api/v1/jobs/scheduler-config",
	tag = "job",
	responses(
		(status = 200, description = "Successfully fetched JobSchedulerConfig", body = JobSchedulerConfig),
		(status = 401, description = "No user is not logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn get_scheduler_config(
	State(ctx): State<AppState>,
) -> APIResult<Json<JobSchedulerConfig>> {
	let client = &ctx.db;

	let server_config = client
		.server_config()
		.find_first(vec![])
		.with(
			server_config::job_schedule_config::fetch()
				.with(job_schedule_config::excluded_libraries::fetch(vec![])),
		)
		.exec()
		.await?
		.ok_or(APIError::InternalServerError(
			"Server preferences have not been initialized".to_string(),
		))?;

	let config = server_config
		.job_schedule_config()?
		.map(|c| c.to_owned())
		.ok_or(APIError::NotFound(
			"Job scheduler config has not been initialized".to_string(),
		))?;

	Ok(Json(JobSchedulerConfig::from(config)))
}

#[derive(Debug, Deserialize, Serialize, ToSchema, specta::Type)]
pub struct UpdateSchedulerConfig {
	pub interval_secs: Option<i32>,
	pub excluded_library_ids: Option<Vec<String>>,
}

#[utoipa::path(
	post,
	path = "/api/v1/jobs/scheduler-config",
	tag = "job",
	responses(
		(status = 200, description = "Successfully updated JobSchedulerConfig", body = Option<JobSchedulerConfig>),
		(status = 401, description = "No user is not logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
async fn update_scheduler_config(
	State(ctx): State<AppState>,
	Json(input): Json<UpdateSchedulerConfig>,
) -> APIResult<Json<Option<JobSchedulerConfig>>> {
	let db = &ctx.db;

	let should_remove_config =
		input.excluded_library_ids.is_none() && input.interval_secs.is_none();

	tracing::trace!(should_remove_config, ?input, "update_scheduler_config");

	let result: Result<Option<JobSchedulerConfig>, APIError> = db
		._transaction()
		.run(|client| async move {
			let server_config = client
				.server_config()
				.find_first(vec![])
				.with(server_config::job_schedule_config::fetch())
				.exec()
				.await?
				.ok_or(APIError::InternalServerError(String::from(
					"Server preferences are missing!",
				)))?;

			let existing_config = server_config.job_schedule_config()?.cloned();

			if should_remove_config {
				client
					.job_schedule_config()
					.delete_many(vec![])
					.exec()
					.await?;
				Ok(None)
			} else if let Some(config) = existing_config {
				let updated_config = client
					.job_schedule_config()
					.update(
						job_schedule_config::id::equals(config.id),
						chain_optional_iter(
							[],
							[
								input
									.interval_secs
									.map(job_schedule_config::interval_secs::set),
								input.excluded_library_ids.map(|list| {
									job_schedule_config::excluded_libraries::set(
										list.into_iter()
											.map(library::id::equals)
											.collect(),
									)
								}),
							],
						),
					)
					.with(job_schedule_config::excluded_libraries::fetch(vec![]))
					.exec()
					.await?;
				Ok(Some(JobSchedulerConfig::from(updated_config)))
			} else {
				let created_config = client
					.job_schedule_config()
					.create(chain_optional_iter(
						[job_schedule_config::server_config::connect(
							server_config::id::equals(server_config.id),
						)],
						[
							input
								.interval_secs
								.map(job_schedule_config::interval_secs::set),
							input.excluded_library_ids.map(|list| {
								job_schedule_config::excluded_libraries::connect(
									list.into_iter().map(library::id::equals).collect(),
								)
							}),
						],
					))
					.with(job_schedule_config::excluded_libraries::fetch(vec![]))
					.exec()
					.await?;
				Ok(Some(JobSchedulerConfig::from(created_config)))
			}
		})
		.await;
	let updated_or_deleted_config = result?;

	Ok(Json(updated_or_deleted_config))
}
