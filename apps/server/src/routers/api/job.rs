use axum::{middleware::from_extractor, routing::get, Extension, Json, Router};
use stump_core::{event::InternalCoreTask, job::JobReport};
use tokio::sync::oneshot;

use crate::{
	config::state::State,
	errors::{ApiError, ApiResult},
	middleware::auth::Auth,
};

// FIXME: admin...
pub(crate) fn mount() -> Router {
	Router::new()
		.route("/jobs", get(get_jobs))
		.layer(from_extractor::<Auth>())
}

/// Get all running/pending jobs.
pub async fn get_jobs(Extension(ctx): State) -> ApiResult<Json<Vec<JobReport>>> {
	let (sender, recv) = oneshot::channel();

	ctx.internal_task(InternalCoreTask::GetJobReports(sender))
		.map_err(|e| {
			ApiError::InternalServerError(format!(
				"Failed to submit internal task: {}",
				e
			))
		})?;

	let res = recv.await.map_err(|e| {
		ApiError::InternalServerError(format!("Failed to get jobs: {}", e))
	})?;

	Ok(Json(res))
}
