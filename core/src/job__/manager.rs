use std::{collections::VecDeque, sync::Arc};

use tokio::sync::{mpsc, oneshot};

use super::error::JobManagerError;
use crate::Ctx;

trait StatefulJob {}

/// Commands that can be sent to the job manager. If any of these commands require
/// a response, e.g., to provide an HTTP status code, a oneshot channel should be provided.
pub enum JobManagerCommand {
	/// Add a job to the queue to be run.
	EnqueueJob(Box<dyn StatefulJob>),

	/// Cancel a job by its ID.
	CancelJob(String, oneshot::Sender<JobManagerResult<()>>),

	/// Shutdown the job manager. This will cancel all running jobs and clear the queue.
	Shutdown(oneshot::Sender<()>),
}

type JobManagerResult<T> = Result<T, JobManagerError>;

/// A struct that manages the execution and queueing of jobs and their workers
pub struct JobManager {
	/// A pointer to the core context
	core_ctx: Arc<Ctx>,
	/// Jobs waiting to be assigned a worker thread
	jobs: VecDeque<Box<dyn StatefulJob>>,
	/// A channel to receive job manager commands
	internal_receiver: mpsc::UnboundedReceiver<JobManagerCommand>,
}

impl JobManager {
	pub fn create(
		core_ctx: Arc<Ctx>,
	) -> (Self, mpsc::UnboundedSender<JobManagerCommand>) {
		let (tx, rx) = mpsc::unbounded_channel();

		(
			Self {
				core_ctx,
				jobs: VecDeque::new(),
				internal_receiver: rx,
			},
			tx,
		)
	}

	/// Start the signal handling loop for the [JobManager].
	pub fn start(mut self) {
		tokio::spawn(async move {
			while let Some(event) = self.internal_receiver.recv().await {
				match event {
					JobManagerCommand::EnqueueJob(job) => self.enqueue_job(job),
					JobManagerCommand::CancelJob(job_id, tx) => {
						self.cancel_job(job_id, tx)
					},
					JobManagerCommand::Shutdown(tx) => self.shutdown(tx),
				}
			}
		});
	}

	/// Add a job to the end of the queue.
	fn enqueue_job(&mut self, job: Box<dyn StatefulJob>) {
		// TODO: Persist the job to the database? Perhaps only after it's been started?

		self.jobs.push_back(job);

		// TODO: Logic to start job here?
	}

	fn cancel_job(&mut self, job_id: String, tx: oneshot::Sender<JobManagerResult<()>>) {
		// TODO: Cancellation logic
		let result = todo!();

		tx.send(result).map_or_else(
			|error| {
				tracing::error!(?error, "Error while sending cancel confirmation");
			},
			|_| tracing::trace!("Cancel confirmation sent"),
		)
	}

	fn shutdown(&mut self, tx: oneshot::Sender<()>) {
		// TODO: Shutdown log

		tx.send(()).map_or_else(
			|error| {
				tracing::error!(?error, "Error while sending shutdown confirmation");
			},
			|_| tracing::trace!("Shutdown confirmation sent"),
		)
	}
}
