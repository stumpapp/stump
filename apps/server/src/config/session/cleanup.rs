use std::collections::VecDeque;

use prisma_client_rust::chrono::Utc;
use serde::{Deserialize, Serialize};
use stump_core::{
	job::{
		error::JobError, JobExecuteLog, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx,
		WorkingState, WrappedJob,
	},
	prisma::session,
};

pub const SESSION_CLEANUP_JOB_NAME: &str = "session_cleanup";

/// The data that is collected and updated during the execution of a library scan job
#[derive(Serialize, Deserialize, Default, Debug)]
pub struct SessionCleanupJobOutput {
	/// The number of removed sessions
	removed_sessions: u64,
}

impl JobOutputExt for SessionCleanupJobOutput {}

#[derive(Clone)]
pub struct SessionCleanupJob;

impl SessionCleanupJob {
	pub fn new() -> Box<WrappedJob<SessionCleanupJob>> {
		WrappedJob::new(Self)
	}
}

#[async_trait::async_trait]
impl JobExt for SessionCleanupJob {
	const NAME: &'static str = SESSION_CLEANUP_JOB_NAME;

	type Output = SessionCleanupJobOutput;
	type Task = ();

	fn description(&self) -> Option<String> {
		None
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let mut output = Self::Output::default();
		let mut logs = vec![];

		let affected_rows = ctx
			.db
			.session()
			.delete_many(vec![session::expiry_time::lt(Utc::now().into())])
			.exec()
			.await
			.map_or_else(
				|e| {
					logs.push(JobExecuteLog::error(format!(
						"Failed to delete expired sessions: {:?}",
						e.to_string()
					)));
					0
				},
				|count| count as u64,
			);
		output.removed_sessions = affected_rows;
		tracing::debug!(affected_rows = ?affected_rows, "Deleted expired sessions");

		Ok(WorkingState {
			output: Some(output),
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
		unreachable!("SessionCleanupJob does not have any tasks! It should not be executed with any tasks!")
	}
}
