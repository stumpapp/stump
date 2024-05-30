mod task_analyze_dimensions;
mod task_page_count;
mod utils;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	job::{
		error::JobError, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx, WorkingState,
		WrappedJob,
	},
	prisma::{media, series},
};

type MediaID = String;
type SeriesID = String;
type LibraryID = String;

#[derive(Clone)]
pub enum AnalyzeMediaJobVariant {
	/// Analyze an individual media item, specified by ID.
	AnalyzeSingleItem(MediaID),
	/// Analyze all media in a library, specified by library ID.
	AnalyzeLibrary(LibraryID),
	/// Analyze all media in a series, specified by series ID.
	AnalyzeSeries(SeriesID),
	/// Analyze all media in a media group, specified with a list of media IDs.
	AnalyzeMediaGroup(Vec<MediaID>),
}

#[derive(Serialize, Deserialize, Debug)]
pub enum AnalyzeMediaTask {
	/// Count the pages of a media item specified by an ID.
	UpdatePageCount(MediaID),
	/// Analyze and store dimensions for each page ofa  media item specified by an ID.
	AnalyzePageDimensions(MediaID),
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, Type)]
pub struct AnalyzeMediaOutput {
	/// The number of page counts analyzed.
	page_counts_analyzed: u64,
	/// The number of images whose dimensions were analyzed.
	image_dimensions_analyzed: u64,
	/// The number of media item updates performed.
	media_updated: u64,
}

impl JobOutputExt for AnalyzeMediaOutput {
	fn update(&mut self, updated: Self) {
		self.page_counts_analyzed += updated.page_counts_analyzed;
		self.image_dimensions_analyzed += updated.image_dimensions_analyzed;
		self.media_updated += updated.media_updated;
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
				vec![AnalyzeMediaTask::UpdatePageCount(id.clone())]
			},
			// For libraries we need a list of ids
			AnalyzeMediaJobVariant::AnalyzeLibrary(id) => {
				let library_media = ctx
					.db
					.media()
					.find_many(vec![media::series::is(vec![series::library_id::equals(
						Some(id.clone()),
					)])])
					.select(media::select!({ id }))
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				library_media
					.into_iter()
					.map(|media| AnalyzeMediaTask::UpdatePageCount(media.id))
					.collect()
			},
			// We also need a list for series
			AnalyzeMediaJobVariant::AnalyzeSeries(id) => {
				let series_media = ctx
					.db
					.media()
					.find_many(vec![media::series_id::equals(Some(id.clone()))])
					.select(media::select!({ id }))
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				series_media
					.into_iter()
					.map(|media| AnalyzeMediaTask::UpdatePageCount(media.id))
					.collect()
			},
			// Media groups already include a vector of ids
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => ids
				.iter()
				.map(|id| AnalyzeMediaTask::UpdatePageCount(id.clone()))
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
			AnalyzeMediaTask::UpdatePageCount(id) => {
				task_analyze_dimensions::do_task(id, ctx, &mut output).await?
			},
			AnalyzeMediaTask::AnalyzePageDimensions(id) => {
				task_page_count::do_task(id, ctx, &mut output).await?
			},
		}

		Ok(JobTaskOutput {
			output,
			subtasks: vec![],
			logs: vec![],
		})
	}
}
