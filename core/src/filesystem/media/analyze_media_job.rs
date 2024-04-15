use std::collections::VecDeque;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	filesystem::media::process::get_page_count,
	job::{
		error::JobError, Executor, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx,
		WorkingState, WrappedJob,
	},
	prisma::media,
};

/// A job that analyzes a media item and updates the database
/// with information from the analysis.
#[derive(Clone)]
pub struct AnalyzeMediaJob {
	pub id: String,
}

impl AnalyzeMediaJob {
	/// Create a new [AnalyzeMediaJob] for the media specified by `id`.
	pub fn new(id: String) -> Box<WrappedJob<AnalyzeMediaJob>> {
		WrappedJob::new(Self { id })
	}
}

#[derive(Serialize, Deserialize, Debug)]
pub enum AnalyzeMediaTask {
	AnalyzeImage(String),
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, Type)]
pub struct AnalyzeMediaOutput {
	/// The number of images analyzed
	images_analyzed: u64,
}

impl JobOutputExt for AnalyzeMediaOutput {
	fn update(&mut self, updated: Self) {
		self.images_analyzed += updated.images_analyzed;
	}
}

#[async_trait::async_trait]
impl JobExt for AnalyzeMediaJob {
	const NAME: &'static str = "analyze_media";

	type Output = AnalyzeMediaOutput;
	type Task = AnalyzeMediaTask;

	fn description(&self) -> Option<String> {
		Some(format!("Scanning media with id: {}", self.id))
	}

	// TODO
	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		tracing::warn!("In AnalyzeMediaJob init()");
		let output = Self::Output::default();

		let mut tasks = VecDeque::new();
		tasks.push_front(AnalyzeMediaTask::AnalyzeImage(self.id.clone()));

		Ok(WorkingState {
			output: Some(output),
			tasks,
			completed_tasks: 0,
			logs: vec![],
		})
	}

	// TODO
	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		tracing::warn!("In AnalyzeMediaJob execute_task() with task: {:?}", task);
		let output = Self::Output::default();

		match task {
			AnalyzeMediaTask::AnalyzeImage(id) => {
				// Get media by id from the database
				let media = ctx
					.db
					.media()
					.find_unique(media::id::equals(id.clone()))
					.exec()
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				// Error if media item unavailable
				if media.is_none() {
					return Err(JobError::TaskFailed(format!(
						"Unable to find media item with id: {}",
						id
					)));
				}

				// Get page count using file processing
				let path = media.unwrap().path;
				let page_count = get_page_count(&path, &ctx.config)?;

				// Update media item in database
				let _ = ctx
					.db
					.media()
					.update(media::id::equals(id), vec![media::pages::set(page_count)])
					.exec()
					.await?;
			},
		}

		Ok(JobTaskOutput {
			output,
			subtasks: vec![],
			logs: vec![],
		})
	}

	// TODO
	async fn cleanup(
		&self,
		ctx: &WorkerCtx,
		output: &Self::Output,
	) -> Result<Option<Box<dyn Executor>>, JobError> {
		tracing::warn!("In AnalyzeMediaJob cleanup()");

		Ok(None)
	}
}
