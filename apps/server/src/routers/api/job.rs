use axum::{
	extract::Path,
	middleware::from_extractor,
	routing::{delete, get},
	Extension, Json, Router,
};
use stump_core::{
	event::InternalCoreTask,
	job::{JobReport, TestJob},
};
use tokio::sync::oneshot;

use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
};

// FIXME: admin...
pub(crate) fn mount() -> Router {
	let mut router = Router::new()
		.route("/jobs", get(get_jobs))
		.route("/jobs/:id/cancel", delete(cancel_job));

	if cfg!(debug_assertions) {
		router = router.route("/jobs/test", get(test_job))
	}

	// router
	router.layer(from_extractor::<Auth>())
}

/// Get all running/pending jobs.
async fn get_jobs(Extension(ctx): State) -> ApiResult<Json<Vec<JobReport>>> {
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

async fn test_job(Extension(ctx): State) -> ApiResult<()> {
	ctx.internal_task(InternalCoreTask::QueueJob(Box::new(TestJob {
		interval: Some(1),
		max_ticks: Some(100),
	})))
	.map_err(|e| {
		ApiError::InternalServerError(format!("Failed to submit internal task: {}", e))
	})?;

	Ok(())
}
