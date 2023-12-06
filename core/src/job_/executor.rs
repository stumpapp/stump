use super::{JobError, WorkerCtx};

#[async_trait::async_trait]
pub trait JobExecutorTrait: Send + Sync {
	async fn execute(&mut self, ctx: WorkerCtx) -> Result<(), JobError>;
	async fn finish(
		&self,
		result: Result<(), JobError>,
		ctx: WorkerCtx,
	) -> Result<(), JobError>;
}

pub struct Job<I: StatefulJob> {
	inner_job: I,
}
