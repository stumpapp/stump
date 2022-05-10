use rocket::{
	response::stream::{Event, EventStream},
	serde::json::Json,
	tokio::{
		self,
		sync::{broadcast::error::RecvError, oneshot},
	},
	Shutdown,
};

use crate::types::{
	alias::{ApiResult, Context},
	errors::ApiError,
	event::{InternalTask, TaskResponder, TaskResponse},
};

#[get("/jobs")]
pub async fn get_jobs(ctx: &Context) -> ApiResult<Json<TaskResponse>> {
	let (sender, recv) = oneshot::channel();

	ctx.emit_task(TaskResponder {
		task: InternalTask::GetQueuedJobs,
		return_sender: sender,
	});

	let res = recv.await.unwrap_or(Err(ApiError::InternalServerError(
		"Failed to get jobs".to_string(),
	)))?;

	Ok(Json(res))
}

// Subscriber for jobs running in the background.
#[get("/jobs/listen")]
pub async fn jobs_listener(ctx: &Context, mut end: Shutdown) -> EventStream![] {
	let mut rx = ctx.client_receiver();

	EventStream! {
		loop {
			let msg = tokio::select! {
				msg = rx.recv() => match msg {
					Ok(msg) => msg,
					Err(RecvError::Closed) => break,
					Err(RecvError::Lagged(_)) => continue,
				},
				_ = &mut end => break,
			};

			yield Event::json(&msg);
		}
	}
}

// #[delete("/jobs/<thread>")]
// pub async fn cancel_job() {
//     unimplemented!()
// }
