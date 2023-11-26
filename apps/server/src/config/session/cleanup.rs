use prisma_client_rust::chrono::Utc;
use stump_core::{
	job::{Job, JobError, JobTrait, WorkerCtx},
	prisma::session,
};

pub const SESSION_CLEANUP_JOB_NAME: &str = "session_cleanup";

pub struct SessionCleanupJob;

impl SessionCleanupJob {
	pub fn new() -> Box<Job<SessionCleanupJob>> {
		Job::new(Self)
	}
}

#[async_trait::async_trait]
impl JobTrait for SessionCleanupJob {
	fn name(&self) -> &'static str {
		SESSION_CLEANUP_JOB_NAME
	}

	fn description(&self) -> Option<Box<&str>> {
		None
	}

	async fn run(&mut self, ctx: WorkerCtx) -> Result<u64, JobError> {
		tracing::trace!("Deleting expired sessions");

		let client = ctx.core_ctx.db.clone();
		let affected_rows = client
			.session()
			.delete_many(vec![session::expires_at::lt(Utc::now().into())])
			.exec()
			.await?;

		tracing::trace!(affected_rows = ?affected_rows, "Deleted expired sessions");

		Ok(1)
	}
}
