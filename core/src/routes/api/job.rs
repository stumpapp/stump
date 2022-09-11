use rocket::{
	futures::Stream,
	response::stream::{Event, EventStream},
	serde::json::Json,
	tokio::{
		self,
		sync::{broadcast::error::RecvError, oneshot},
	},
	Shutdown,
};
use rocket_okapi::openapi;

use crate::{
	event::InternalCoreTask,
	job::JobReport,
	types::{
		alias::{ApiResult, Ctx},
		errors::ApiError,
	},
};

/// Get all running/pending jobs.
#[openapi(tag = "Job")]
#[get("/jobs")]
pub async fn get_jobs(ctx: &Ctx) -> ApiResult<Json<Vec<JobReport>>> {
	let (sender, recv) = oneshot::channel();

	ctx.internal_task(InternalCoreTask::GetJobReports(sender))
		.map_err(|e| {
			ApiError::InternalServerError(format!(
				"Failed to submit internal task: {}",
				e
			))
		})?;

	let res = recv.await.map_err(|e| {
		ApiError::InternalServerError(format!("Failed to get jobs: {}", e.to_string()))
	})?;

	Ok(Json(res))
}

/// Subscriber for jobs running in the background. Will emit SSE, as they occur,
/// to the listener.
#[openapi(tag = "Job")]
#[get("/jobs/listen")]
pub async fn jobs_listener(
	ctx: &Ctx,
	mut end: Shutdown,
) -> EventStream<impl Stream<Item = Event>> {
	let mut rx = ctx.get_client_receiver();

	EventStream! {
		loop {
			let msg = tokio::select! {
				msg = rx.recv() => match msg {
					Ok(msg) => msg,
					Err(RecvError::Closed) => {
						log::debug!("Client receiver closed");
						continue
					},
					Err(RecvError::Lagged(_)) => {
						log::debug!("Client receiver lagged");
						continue
					},
				},
				_ = &mut end => {
					log::debug!("Client receiver shutdown");
					break
				},
				// _ = &mut end => continue,
			};

			yield Event::json(&msg);
		}
	}
}

// #[delete("/jobs/<thread>")]
// pub async fn cancel_job() {
//     unimplemented!()
// }
