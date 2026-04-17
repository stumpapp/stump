use std::sync::Arc;

use apalis::prelude::Data;
use models::shared::enums::JobStatus;
use uuid::Uuid;

use crate::{
	event::JobStarted,
	filesystem::{
		image::{PlaceholderGenerationJob, ThumbnailGenerationJob},
		media::analysis::AnalyzeMediaJob,
		metadata::MetadataFetchJob,
		scanner::{LibraryScanJob, SeriesScanJob},
	},
	job::{
		error::JobError, stump_job::StumpJob, ApalisWorkerState, CoreJobOutput,
		JobContext, JobLifecycle, JobOutputExt, JobProgress, WorkingState,
	},
	CoreEvent,
};

/// Run a job through its full lifecycle
async fn run_job<J>(ctx: &JobContext, job: &mut J) -> Result<(), JobError>
where
	J: JobLifecycle,
	J::Output: Clone + Into<CoreJobOutput>,
{
	ctx.emit_event(CoreEvent::JobStarted(JobStarted {
		id: ctx.job_id.clone(),
	}));
	ctx.report_progress(JobProgress::status_msg(
		JobStatus::Running,
		"Initializing job",
	));

	let working_state = match job.init(ctx).await {
		Ok(state) => state,
		Err(e) => {
			ctx.fail(JobStatus::Failed, &format!("Init failed: {e}"))
				.await?;
			return Err(e);
		},
	};

	let WorkingState {
		output: initial_output,
		mut tasks,
		mut logs,
	} = working_state;

	let mut output = initial_output.unwrap_or_default();
	let total_tasks = tasks.len();

	let mut completed = 0u64;
	while let Some(task) = tasks.pop_front() {
		if ctx.is_canceled() {
			ctx.cancel().await?;
			return Ok(());
		}

		ctx.report_progress(JobProgress::subtask_position(
			completed as i32,
			total_tasks as i32,
		));

		match job.execute_task(ctx, task).await {
			Ok(task_output) => {
				output.update(task_output.output);
				logs.extend(task_output.logs);
				for subtask in task_output.subtasks.into_iter().rev() {
					tasks.push_front(subtask);
				}
				completed += 1;
			},
			Err(e) => {
				tracing::error!(error = ?e, job = J::NAME, "Task failed");
				// TODO: Should single task fail entire job? Maybe a fail fast flag?
				ctx.fail(JobStatus::Failed, &format!("Task failed: {e}"))
					.await?;
				return Err(e);
			},
		}
	}

	job.finalize(ctx, &output).await?;
	ctx.report_output(output.clone().into());
	ctx.complete(&output, logs).await
}

/// The top-level apalis handler function for all jobs
pub async fn dispatch_job(
	job: StumpJob,
	ctx: Data<Arc<ApalisWorkerState>>,
) -> Result<(), apalis::prelude::Error> {
	let job_id = Uuid::new_v4().to_string();
	let job_name = job.name();

	tracing::info!(%job_id, job_name, "Starting job");

	let job_ctx = match JobContext::new(Arc::clone(&ctx), job_id.clone(), &job).await {
		Ok(h) => h,
		Err(e) => {
			tracing::error!(?e, "Failed to start job");
			return Err(apalis::prelude::Error::Failed(Arc::new(Box::new(e))));
		},
	};

	let result = match job {
		StumpJob::LibraryScan { id, path, options } => {
			run_job(
				&job_ctx,
				&mut LibraryScanJob {
					id,
					path,
					config: None,
					options: options.unwrap_or_default(),
				},
			)
			.await
		},
		StumpJob::SeriesScan { id, path, options } => {
			run_job(
				&job_ctx,
				&mut SeriesScanJob {
					id,
					path,
					config: None,
					options: options.unwrap_or_default(),
				},
			)
			.await
		},
		StumpJob::ThumbnailGeneration { options, params } => {
			run_job(&job_ctx, &mut ThumbnailGenerationJob { options, params }).await
		},
		StumpJob::PlaceholderGeneration { config } => {
			run_job(&job_ctx, &mut PlaceholderGenerationJob { config }).await
		},
		StumpJob::MetadataFetch { params } => {
			run_job(
				&job_ctx,
				&mut MetadataFetchJob {
					params,
					provider_cache: None,
				},
			)
			.await
		},
		StumpJob::AnalyzeMedia { config } => {
			run_job(&job_ctx, &mut AnalyzeMediaJob { config }).await
		},
	};

	if let Err(e) = result {
		tracing::error!(?e, "Job failed");
		return Err(apalis::prelude::Error::Failed(Arc::new(Box::new(e))));
	}

	Ok(())
}
