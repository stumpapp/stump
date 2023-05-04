use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::{self, sync::Mutex};
use tracing::error;

use crate::{
	error::{CoreError, CoreResult},
	event::CoreEvent,
	Ctx,
};

use super::{persist_new_job, pool::JobPool, Job, JobUpdate, JobWrapper};

#[derive(Clone, Serialize, Deserialize)]
pub enum RunnerEvent {
	Progress(Vec<JobUpdate>),
	Completed,
	Failed,
}

/// The [`RunnerCtx`] is the main context for a job runner. It contains the core
/// context used throughout the core, as well as the `runner_id` and a
/// channel for job updates.
#[derive(Clone)]
pub struct RunnerCtx {
	/// The unique id of the runner owning this context.
	pub runner_id: String,
	/// The core context, used for database operations and accessing the internal
	/// event channel.
	pub core_ctx: Ctx,
	// A channel dedicated to sending job updates to a receiver.
	// #[deprecated = "Use `core_ctx.emit_client_event` instead. Too many bugs with this for now."]
	// pub progress_tx: Arc<broadcast::Sender<JobUpdate>>,
}

impl RunnerCtx {
	pub fn new(ctx: Ctx, id: String) -> Self {
		// let (progress_tx, _) = broadcast::channel(1024);

		RunnerCtx {
			runner_id: id,
			core_ctx: ctx,
			// progress_tx: Arc::new(progress_tx),
		}
	}

	pub fn progress(&self, e: JobUpdate) {
		// let _ = self.progress_tx.send(e);
		self.core_ctx.emit_client_event(CoreEvent::JobProgress(e));
		// .expect("Fatal error: failed to send job progress event.");
	}
}

/// The [`Runner`] is the main job runner. It holds the [`JoinHandle`] for the job.
/// The [`JobPool`] keeps track of runners.
pub struct Runner {
	/// The unique id of the runner.
	pub id: String,
	// TODO: I probably don't need this to be optional anymore, I changed how Runner
	// works a while ago and never updated this...
	/// The job that the runner is managing.
	job: Option<Box<dyn Job>>,
	/// The [`JoinHandle`] for the job. This is mainly kept so a job can be
	/// properly cancelled.
	handle: Option<tokio::task::JoinHandle<()>>,
}

impl Runner {
	/// Uses the `cuid` crate to generate a unique id for the runner.
	pub fn create_id() -> String {
		cuid::cuid().expect("Failed to generate CUID for runner.")
	}

	/// Creates a new [`Runner`] for a given [`Job`]. This is asynchronous
	/// mainly because the job will be persisted to the database here.
	pub async fn new(ctx: &Ctx, job: Box<dyn Job>) -> Self {
		let id = Runner::create_id();

		// FIXME: error handling
		let _ = persist_new_job(ctx, id.clone(), job.as_ref()).await;

		Runner {
			id,
			job: Some(job),
			handle: None,
		}
	}

	/// Spawns the job and sets the [`JoinHandle`] for the runner. The job will
	/// be wrapped in a [`JobWrapper`] to handle the progress updates, time tracking,
	/// and other common, shared functionalities.
	pub async fn spawn(
		job_pool: Arc<JobPool>,
		runner_arc: Arc<Mutex<Self>>,
		ctx: Ctx,
	) -> CoreResult<()> {
		let mut runner = runner_arc.lock().await;
		let runner_id = runner.id.clone();

		let maybe_job = runner.job.take();

		if maybe_job.is_none() {
			return Err(CoreError::InternalError(
				"Missing job in job runner {}".to_string(),
			));
		}

		let job = maybe_job.unwrap();
		drop(runner);

		let handle = tokio::spawn(async move {
			let runner_id = runner_id.clone();
			let runner_ctx = RunnerCtx::new(ctx.clone(), runner_id.clone());
			let mut job_wrapper = JobWrapper::new(job);

			if let Err(e) = job_wrapper.run(runner_ctx).await {
				error!("job failed {:?}", e);

				ctx.handle_failure_event(CoreEvent::JobFailed {
					runner_id: runner_id.clone(),
					message: e.to_string(),
				})
				.await;
			} else {
				ctx.emit_client_event(CoreEvent::JobComplete(runner_id.clone()));
			}

			job_pool.dequeue_job(runner_id).await;
		});

		runner_arc.lock().await.handle = Some(handle);
		drop(runner_arc);

		Ok(())
	}

	/// Attempts to cancel the job, returning whether or not a job was cancelled.
	/// If a runner has a thread handle, it will be aborted.
	/// Otherwise, no spawned task exists.
	pub fn shutdown(&mut self) -> bool {
		if let Some(handle) = self.handle.take() {
			println!("Shutting down job runner {}", self.id);
			handle.abort();
			true
		} else {
			false
		}
	}

	// TODO: function to persist to DB
	// TODO: function to remove from DB
}
