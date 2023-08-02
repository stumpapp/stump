use crate::{prisma::job, CoreError, CoreResult, Ctx};
use prisma_client_rust::chrono::Utc;
use std::num::TryFromIntError;
use tracing::trace;

use super::JobStatus;

pub async fn persist_new_job(
	core_ctx: &Ctx,
	id: String,
	name: String,
	description: Option<String>,
) -> CoreResult<job::Data> {
	let db = core_ctx.get_db();
	let job = db
		.job()
		.create(id, name, vec![job::description::set(description)])
		.exec()
		.await?;
	trace!(?job, "Persisted new job to database");
	Ok(job)
}

pub async fn persist_job_start(
	core_ctx: &Ctx,
	job_id: String,
	task_count: u64,
) -> CoreResult<()> {
	let db = core_ctx.get_db();
	let _ = db
		.job()
		.update(
			job::id::equals(job_id.clone()),
			vec![
				// TODO: I am clearly using this a lot, make a mapping for it
				job::task_count::set(task_count.try_into().map_err(
					|e: TryFromIntError| CoreError::InternalError(e.to_string()),
				)?),
				job::status::set(JobStatus::Running.to_string()),
			],
		)
		.exec()
		.await?;
	Ok(())
}

pub async fn persist_job_end(
	core_ctx: &Ctx,
	job_id: String,
	status: JobStatus,
	ms_elapsed: u64,
	completed_task_count: Option<u64>,
) -> CoreResult<()> {
	let db = core_ctx.get_db();
	let mut params = vec![
		// FIXME: potentially unsafe cast u64 -> i64
		job::ms_elapsed::set(
			ms_elapsed
				.try_into()
				.map_err(|e: TryFromIntError| CoreError::InternalError(e.to_string()))?,
		),
		job::status::set(status.to_string()),
		job::completed_at::set(Some(Utc::now().into())),
	];
	if let Some(count) = completed_task_count {
		params.push(job::completed_task_count::set(count.try_into().map_err(
			|e: TryFromIntError| CoreError::InternalError(e.to_string()),
		)?));
	}

	// NOTE: this error get's handled by caller FYI
	let _ = db
		.job()
		.update(job::id::equals(job_id.clone()), params)
		.exec()
		.await?;

	Ok(())
}
