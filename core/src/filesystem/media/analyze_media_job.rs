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

type MediaID = String;

#[derive(Clone)]
pub enum AnalyzeMediaJobVariant {
	/// Analyze an individual media item, specified by ID.
	AnalyzeSingleItem(MediaID),
	/// Analyze all media in a library, specified by library ID.
	AnalyzeLibrary(MediaID),
	/// Analyze all media in a series, specified by series ID.
	AnalyzeSeries(MediaID),
	/// Analyze all media in a media group, specified with a list of media IDs.
	AnalyzeMediaGroup(Vec<MediaID>),
}

#[derive(Serialize, Deserialize, Debug)]
pub enum AnalyzeMediaTask {
	/// Analyze the image for an individual media item, specified by ID.
	AnalyzeImage(MediaID),
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
		let output = Self::Output::default();

		// We match over the job variant to build a list of tasks to process
		let tasks = match &self.variant {
			// Single item is easy
			AnalyzeMediaJobVariant::AnalyzeSingleItem(id) => {
				vec![AnalyzeMediaTask::AnalyzeImage(id.clone())]
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

				library_media
					.into_iter()
					.map(|media| AnalyzeMediaTask::AnalyzeImage(media.id))
					.collect()
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

				series_media
					.into_iter()
					.map(|media| AnalyzeMediaTask::AnalyzeImage(media.id))
					.collect()
			},
			// Media groups already include a vector of ids
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => ids
				.iter()
				.map(|id| AnalyzeMediaTask::AnalyzeImage(id.clone()))
				.collect(),
		};

		Ok(WorkingState {
			output: Some(output),
			tasks: tasks.into(),
			completed_tasks: 0,
			logs: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let mut output = Self::Output::default();

		match task {
			AnalyzeMediaTask::AnalyzeImage(id) => {
				// Get media by id from the database
				let media = ctx
					.db
					.media()
					.find_unique(media::id::equals(id.clone()))
					.exec()
					.await
					.map_err(|e: prisma_client_rust::QueryError| {
						JobError::TaskFailed(e.to_string())
					})?
					.ok_or_else(|| {
						JobError::TaskFailed(format!(
							"Unable to find media item with id: {}",
							id
						))
					})?;

				// Get page count using file processing
				let path = media.path;
				let page_count = get_page_count(&path, &ctx.config)?;
				output.images_analyzed += 1;

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
