use axum::{
	extract::Path,
	middleware::from_extractor,
	routing::{delete, get},
	Extension, Json, Router,
};
use stump_core::{event::InternalCoreTask, job::JobReport};
use tokio::sync::oneshot;
use tracing::debug;

use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	middleware::auth::{AdminGuard, Auth},
};

pub(crate) fn mount() -> Router {
	Router::new()
		.nest(
			"/jobs",
			Router::new()
				.route("/", get(get_job_reports).delete(delete_job_reports))
				.route("/:id/cancel", delete(cancel_job)),
		)
		.layer(from_extractor::<AdminGuard>())
		.layer(from_extractor::<Auth>())
}

/// Get all running/pending jobs.
async fn get_job_reports(Extension(ctx): State) -> ApiResult<Json<Vec<JobReport>>> {
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

async fn delete_job_reports(Extension(ctx): State) -> ApiResult<()> {
	let result = ctx.db.job().delete_many(vec![]).exec().await?;
	debug!("Deleted {} job reports", result);
	Ok(())
}

async fn cancel_job(Extension(ctx): State, Path(job_id): Path<String>) -> ApiResult<()> {
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
