use axum::{
	extract::{Path, State},
	middleware::{from_extractor, from_extractor_with_state},
	routing::{delete, get},
	Json, Router,
};
use stump_core::{event::InternalCoreTask, job::JobReport};
use tokio::sync::oneshot;
use tracing::debug;

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
				.route("/", get(get_job_reports).delete(delete_job_reports))
				.route("/:id/cancel", delete(cancel_job)),
		)
		.layer(from_extractor::<AdminGuard>())
		.layer(from_extractor_with_state::<Auth, AppState>(app_state))
}

#[utoipa::path(
	get,
	path = "/api/v1/jobs",
	tag = "job",
	responses(
		(status = 200, description = "Successfully retrieved job reports", body = [JobReport]),
		(status = 401, description = "No user is logged in (unauthorized)."),
		(status = 403, description = "User does not have permission to access this resource."),
		(status = 500, description = "Internal server error."),
	)
)]
/// Get all running/pending jobs.
async fn get_job_reports(State(ctx): State<AppState>) -> ApiResult<Json<Vec<JobReport>>> {
	let (task_tx, task_rx) = oneshot::channel();

	ctx.internal_task(InternalCoreTask::GetJobReports(task_tx))
		.map_err(|e| {
			ApiError::InternalServerError(format!(
				"Failed to submit internal task: {}",
				e
			))
		})?;

	let res = task_rx.await.map_err(|e| {
		ApiError::InternalServerError(format!("Failed to get job report: {}", e))
	})??;

	Ok(Json(res))
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

	ctx.internal_task(InternalCoreTask::CancelJob {
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
