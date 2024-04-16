use std::collections::VecDeque;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	filesystem::media::process::get_page_count,
	job::{
		error::JobError, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx, WorkingState,
		WrappedJob,
	},
	prisma::{media, series},
};

#[derive(Clone)]
pub enum AnalyzeMediaJobVariant {
	AnalyzeSingleItem(String),
	AnalyzeLibrary(String),
	AnalyzeSeries(String),
	AnalyzeMediaGroup(Vec<String>),
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

/// A job that analyzes a media item and updates the database
/// with information from the analysis.
#[derive(Clone)]
pub struct AnalyzeMediaJob {
	pub variant: AnalyzeMediaJobVariant,
}

impl AnalyzeMediaJob {
	/// Create a new [AnalyzeMediaJob] for the media specified by `id`.
	pub fn new(variant: AnalyzeMediaJobVariant) -> Box<WrappedJob<AnalyzeMediaJob>> {
		WrappedJob::new(Self { variant })
	}
}

#[async_trait::async_trait]
impl JobExt for AnalyzeMediaJob {
	const NAME: &'static str = "analyze_media";

	type Output = AnalyzeMediaOutput;
	type Task = AnalyzeMediaTask;

	fn description(&self) -> Option<String> {
		match &self.variant {
			AnalyzeMediaJobVariant::AnalyzeSingleItem(id) => {
				Some(format!("Analyze media item with id: {}", id))
			},
			AnalyzeMediaJobVariant::AnalyzeLibrary(id) => {
				Some(format!("Analyze library with id: {}", id))
			},
			AnalyzeMediaJobVariant::AnalyzeSeries(id) => {
				Some(format!("Analyze series with id: {}", id))
			},
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => {
				Some(format!("Analyze media group with ids: {:?}", ids))
			},
		}
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		tracing::warn!("In AnalyzeMediaJob init()");
		let output = Self::Output::default();

		// We match over the job variant to build a list of tasks to process
		let mut tasks = VecDeque::new();
		match &self.variant {
			// Single item is easy
			AnalyzeMediaJobVariant::AnalyzeSingleItem(id) => {
				tasks.push_front(AnalyzeMediaTask::AnalyzeImage(id.clone()))
			},
			// For libraries we need a list of ids
			AnalyzeMediaJobVariant::AnalyzeLibrary(id) => {
				let library_media = ctx
					.db
					.media()
					.find_many(vec![media::series::is(vec![series::library_id::equals(
						Some(id.clone()),
					)])])
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				for media in library_media {
					tasks.push_front(AnalyzeMediaTask::AnalyzeImage(media.id))
				}
			},
			// We also need a list for series
			AnalyzeMediaJobVariant::AnalyzeSeries(id) => {
				let series_media = ctx
					.db
					.media()
					.find_many(vec![media::series_id::equals(Some(id.clone()))])
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				for media in series_media {
					tasks.push_front(AnalyzeMediaTask::AnalyzeImage(media.id))
				}
			},
			// Media groups already include a vector of ids
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => {
				for id in ids {
					tasks.push_front(AnalyzeMediaTask::AnalyzeImage(id.clone()))
				}
			},
		};

		Ok(WorkingState {
			output: Some(output),
			tasks,
			completed_tasks: 0,
			logs: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
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
}
