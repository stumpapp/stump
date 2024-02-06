use std::collections::VecDeque;

use prisma_client_rust::chrono::Utc;
use serde::{Deserialize, Serialize};
use stump_core::{
	job::{
		error::JobError, Job, JobDataExt, JobExt, JobRunLog, JobTaskOutput, WorkerCtx,
		WorkingState,
	},
	prisma::session,
};

pub const SESSION_CLEANUP_JOB_NAME: &str = "session_cleanup";

/// The data that is collected and updated during the execution of a library scan job
#[derive(Serialize, Deserialize, Default, Debug)]
pub struct SessionCleanupJobData {
	/// The number of removed sessions
	removed_sessions: u64,
}

impl JobDataExt for SessionCleanupJobData {}

pub struct SessionCleanupJob;

impl SessionCleanupJob {
	pub fn new() -> Box<Job<SessionCleanupJob>> {
		Job::new(Self)
	}
}

#[async_trait::async_trait]
impl JobExt for SessionCleanupJob {
	const NAME: &'static str = SESSION_CLEANUP_JOB_NAME;

	type Data = SessionCleanupJobData;
	type Task = ();

	fn description(&self) -> Option<String> {
		None
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Data, Self::Task>, JobError> {
		let mut data = Self::Data::default();
		let mut logs = vec![];

		let affected_rows = ctx
			.db
			.session()
			.delete_many(vec![session::expires_at::lt(Utc::now().into())])
			.exec()
			.await
			.map_or_else(
				|e| {
					logs.push(JobRunLog::error(format!(
						"Failed to delete expired sessions: {:?}",
						e.to_string()
					)));
					0
				},
				|count| count as u64,
			);
		data.removed_sessions = affected_rows;
		tracing::debug!(affected_rows = ?affected_rows, "Deleted expired sessions");

		Ok(WorkingState {
			data: Some(data),
			tasks: VecDeque::default(),
			completed_tasks: 0,
			logs,
		})
	}

	async fn execute_task(
		&self,
		_: &WorkerCtx,
		_: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		unreachable!("SessionCleanupJob does not have any tasks")
	}
}
