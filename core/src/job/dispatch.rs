use std::{fmt::Debug, sync::Arc};

use apalis::prelude::Data;
use async_graphql::Union;
use models::shared::{enums::JobStatus, image_processor_options::ImageProcessorOptions};
use serde::{de, Deserialize, Serialize};
use uuid::Uuid;

use crate::{
	event::JobStarted,
	image::thumbnail::{
		PlaceholderGenerationJob, PlaceholderGenerationJobConfig,
		PlaceholderGenerationOutput, ThumbnailGenerationJob,
		ThumbnailGenerationJobParams, ThumbnailGenerationOutput,
	},
	job::{
		context::{ApalisWorkerState, JobContext},
		error::JobError,
		JobLifecycle, JobProgress, WorkingState,
	},
	media::analysis::{AnalysisJobConfig, AnalyzeMediaJob, AnalyzeMediaOutput},
	metadata::provider::{
		MetadataFetchJob, MetadataFetchJobOutput, MetadataFetchJobParams,
	},
	scan::{
		library::{LibraryScanJob, LibraryScanOutput},
		options::ScanOptions,
		series::{SeriesScanJob, SeriesScanOutput},
	},
	CoreEvent,
};

#[derive(Debug, Clone, Serialize, Deserialize, Union)]
#[serde(untagged, rename_all = "camelCase")]
pub enum CoreJobOutput {
	LibraryScan(LibraryScanOutput),
	SeriesScan(SeriesScanOutput),
	ThumbnailGeneration(ThumbnailGenerationOutput),
	PlaceholderGeneration(PlaceholderGenerationOutput),
	MetadataFetch(MetadataFetchJobOutput),
	AnalyzeMedia(AnalyzeMediaOutput),
}

/// A trait to extend the output type for a job with a common interface. Job output starts
/// in an 'empty' state (Default) and is frequently updated during execution.
///
/// The state is also serialized and stored in the DB, so it must implement [Serialize] and [`de::DeserializeOwned`].
pub trait JobOutputExt: Serialize + de::DeserializeOwned + Debug {
	/// Update the state with new data. By default, the implementation is a full replacement
	fn update(&mut self, updated: Self) {
		*self = updated;
	}

	/// Serialize the state to JSON. If serialization fails, the error is logged and None is returned.
	fn into_json(self) -> Option<serde_json::Value> {
		serde_json::to_value(&self).map_or_else(
			|error| {
				tracing::error!(?error, job_data = ?self, "Failed to serialize job data!");
				None
			},
			Some,
		)
	}
}

/// A unified job enum that can represent any job in the system.
/// This is the type stored in the apalis `MemoryStorage` and is what
/// gets enqueued via `Ctx::enqueue()`.
///
/// Each variant contains the data needed to construct and run the corresponding job.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum StumpJob {
	LibraryScan {
		id: String,
		path: String,
		options: Option<ScanOptions>,
	},
	SeriesScan {
		id: String,
		path: String,
		options: Option<ScanOptions>,
	},
	ThumbnailGeneration {
		options: ImageProcessorOptions,
		params: ThumbnailGenerationJobParams,
	},
	PlaceholderGeneration {
		config: PlaceholderGenerationJobConfig,
	},
	MetadataFetch {
		params: MetadataFetchJobParams,
	},
	AnalyzeMedia {
		config: AnalysisJobConfig,
	},
}

impl StumpJob {
	/// Returns the human-readable name of the job
	pub fn name(&self) -> &'static str {
		match self {
			StumpJob::LibraryScan { .. } => "library_scan",
			StumpJob::SeriesScan { .. } => "series_scan",
			StumpJob::ThumbnailGeneration { .. } => "thumbnail_generation",
			StumpJob::PlaceholderGeneration { .. } => "placeholder_generation",
			StumpJob::MetadataFetch { .. } => "metadata_fetch",
			StumpJob::AnalyzeMedia { .. } => "analyze_media",
		}
	}

	/// Returns a description for the job
	pub fn description(&self) -> Option<String> {
		match self {
			StumpJob::LibraryScan { path, .. } => Some(path.clone()),
			StumpJob::SeriesScan { path, .. } => Some(path.clone()),
			StumpJob::ThumbnailGeneration { params, .. } => {
				Some(format!("Thumbnail generation: {:?}", params))
			},
			StumpJob::PlaceholderGeneration { .. } => Some(
				"Generate placeholder thumbnail metadata for media, series, or libraries"
					.to_string(),
			),
			StumpJob::MetadataFetch { params } => {
				Some(format!("Metadata fetch: {:?}", params.scope))
			},
			StumpJob::AnalyzeMedia { config } => {
				Some(format!("Analyze media: {:?}", config.scope))
			},
		}
	}

	pub fn library_scan(id: String, path: String, options: Option<ScanOptions>) -> Self {
		StumpJob::LibraryScan { id, path, options }
	}

	pub fn series_scan(id: String, path: String, options: Option<ScanOptions>) -> Self {
		StumpJob::SeriesScan { id, path, options }
	}

	pub fn thumbnail_generation(
		options: ImageProcessorOptions,
		params: ThumbnailGenerationJobParams,
	) -> Self {
		StumpJob::ThumbnailGeneration { options, params }
	}

	pub fn placeholder_generation(config: PlaceholderGenerationJobConfig) -> Self {
		StumpJob::PlaceholderGeneration { config }
	}

	pub fn metadata_fetch(params: MetadataFetchJobParams) -> Self {
		StumpJob::MetadataFetch { params }
	}

	pub fn analyze_media(config: AnalysisJobConfig) -> Self {
		StumpJob::AnalyzeMedia { config }
	}
}

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
	let mut completed = 0u64;
	while let Some(task) = tasks.pop_front() {
		if ctx.is_canceled() {
			ctx.cancel().await?;
			return Ok(());
		}

		ctx.report_progress(JobProgress::task_position(
			completed as i32,
			(tasks.len() + 1) as i32,
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
			run_job(&job_ctx, &mut LibraryScanJob::new(id, path, options)).await
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
