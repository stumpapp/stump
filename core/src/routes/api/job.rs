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
	event::ClientRequest,
	job::JobReport,
	types::{
		alias::{ApiResult, Ctx},
		errors::ApiError,
	},
};

// https://github.com/GREsau/okapi/blob/e686b442d6d7bb30913edf1bae900d14ea754cb1/examples/streams/src/main.rs

/// Get all running/pending jobs.
#[openapi(tag = "Job")]
#[get("/jobs")]
pub async fn get_jobs(ctx: &Ctx) -> ApiResult<Json<Vec<JobReport>>> {
	let (sender, recv) = oneshot::channel();

	// TODO: fail here if can't submit task?
	let _ = ctx.internal_task(ClientRequest::GetJobReports(sender));

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
