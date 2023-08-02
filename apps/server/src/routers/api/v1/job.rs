use axum::{
	extract::{Path, Query, State},
	middleware::{from_extractor, from_extractor_with_state},
	routing::{delete, get},
	Json, Router,
};
use serde_qs::axum::QsQuery;
use stump_core::{
	db::query::{
		ordering::QueryOrder,
		pagination::{Pageable, Pagination, PaginationQuery},
	},
	event::InternalCoreTask,
	job::JobDetail,
	prisma::job::{self, OrderByParam as JobOrderByParam},
};
use tokio::sync::oneshot;
use tracing::{debug, trace};

use crate::{
	config::state::AppState,
	errors::{ApiError, ApiResult},
	middleware::auth::{AdminGuard, Auth},
};

pub(crate) fn mount(app_state: AppState) -> Router<AppState> {
	Router::new()
		.nest(
			"/jobs",
			Router::new()
				.route("/", get(get_jobs).delete(delete_job_reports))
				.route("/:id/cancel", delete(cancel_job)),
		)
		.layer(from_extractor::<AdminGuard>())
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

// TODO: support filtering
#[utoipa::path(
	get,
	path = "/api/v1/jobs",
	tag = "job",
	responses(
		(status = 200, description = "Successfully retrieved job reports", body = [JobDetail]),
		(status = 401, description = "No user is logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all running/pending jobs.
async fn get_jobs(
	order: QsQuery<QueryOrder>,
	pagination_query: Query<PaginationQuery>,
	State(ctx): State<AppState>,
) -> ApiResult<Json<Pageable<Vec<JobDetail>>>> {
	let pagination = pagination_query.0.get();
	let order = order.0;

	trace!(?pagination, ?order, "get_jobs");

	let db = ctx.get_db();
	let is_unpaged = pagination.is_unpaged();
	let order_by_param: JobOrderByParam = order.try_into()?;

	let pagination_cloned = pagination.clone();

	let (jobs, count) = db
		._transaction()
		.run(|client| async move {
			let mut query = client.job().find_many(vec![]).order_by(order_by_param);

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
				.map(JobDetail::from)
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

	// let (task_tx, task_rx) = oneshot::channel();

	// ctx.dispatch_task(InternalCoreTask::GetJobs(task_tx))
	// 	.map_err(|e| {
	// 		ApiError::InternalServerError(format!(
	// 			"Failed to submit internal task: {}",
	// 			e
	// 		))
	// 	})?;

	// let res = task_rx.await.map_err(|e| {
	// 	ApiError::InternalServerError(format!("Failed to get job report: {}", e))
	// })??;

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
/// Delete all job reports.
async fn delete_job_reports(State(ctx): State<AppState>) -> ApiResult<()> {
	let result = ctx.db.job().delete_many(vec![]).exec().await?;
	debug!("Deleted {} job reports", result);
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
async fn cancel_job(
	State(ctx): State<AppState>,
	Path(job_id): Path<String>,
) -> ApiResult<()> {
	let (task_tx, task_rx) = oneshot::channel();

	ctx.dispatch_task(InternalCoreTask::CancelJob {
		job_id,
		return_sender: task_tx,
	})
	.map_err(|e| {
		ApiError::InternalServerError(format!("Failed to submit internal task: {}", e))
	})?;

	Ok(task_rx.await.map_err(|e| {
		ApiError::InternalServerError(format!("Failed to cancel job: {}", e))
	})??)
}
