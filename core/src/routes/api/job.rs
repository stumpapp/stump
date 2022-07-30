use rocket::{
	futures::Stream,
	response::stream::{Event, EventStream},
	tokio::{self, sync::broadcast::error::RecvError},
	Shutdown,
};
use rocket_okapi::openapi;

use crate::types::alias::Ctx;

// https://github.com/GREsau/okapi/blob/e686b442d6d7bb30913edf1bae900d14ea754cb1/examples/streams/src/main.rs

/// Get all running/pending jobs.
#[get("/jobs")]
pub async fn get_jobs(_ctx: &Ctx) {
	// let (sender, recv) = oneshot::channel();

	// // ctx.emit_task(TaskResponder {
	// // 	task: InternalTask::GetQueuedJobs,
	// // 	return_sender: sender,
	// // });

	// let res = recv.await.unwrap_or(Err(ApiError::InternalServerError(
	// 	"Failed to get jobs".to_string(),
	// )))?;

	// Ok(Json(res))

	unimplemented!()
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
