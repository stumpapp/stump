mod task_analyze_dimensions;
mod task_page_count;

use crate::job::{
	error::JobError, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx, WorkingState,
	WrappedJob,
};
use models::entity::{media, series};
use sea_orm::{prelude::*, QuerySelect};
use serde::{Deserialize, Serialize};

type MediaID = String;
type SeriesID = String;
type LibraryID = String;

// FIXME: This operation needs to be re-thought. I've noticed it can be a reallllll hog

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
	/// Analyze and store dimensions for each page of a media item specified by an ID.
	AnalyzePageDimensions(MediaID),
	/// Performs both [`UpdatePageCount`] and then [`AnalyzePageDimensions`] in sequence for
	/// the media item specified by an ID.
	FullAnalysis(MediaID),
}

#[derive(Clone, Serialize, Deserialize, Default, Debug)]
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
	/// Create a new [`AnalyzeMediaJob`] for the media specified by `media_id`.
	pub fn analyze_media_item(media_id: String) -> Box<WrappedJob<AnalyzeMediaJob>> {
		WrappedJob::new(Self {
			variant: AnalyzeMediaJobVariant::AnalyzeSingleItem(media_id),
		})
	}

	/// Create a new [`AnalyzeMediaJob`] for the `group_ids`s specified.
	pub fn analyze_media_group(
		group_ids: Vec<String>,
	) -> Box<WrappedJob<AnalyzeMediaJob>> {
		WrappedJob::new(Self {
			variant: AnalyzeMediaJobVariant::AnalyzeMediaGroup(group_ids),
		})
	}

	/// Create a new [`AnalyzeMediaJob`] for the library specified by `library_id`.
	pub fn analyze_library(library_id: String) -> Box<WrappedJob<AnalyzeMediaJob>> {
		WrappedJob::new(Self {
			variant: AnalyzeMediaJobVariant::AnalyzeLibrary(library_id),
		})
	}

	/// Create a new [`AnalyzeMediaJob`] for the series specified by `series_id`.
	pub fn analyze_series(series_id: String) -> Box<WrappedJob<AnalyzeMediaJob>> {
		WrappedJob::new(Self {
			variant: AnalyzeMediaJobVariant::AnalyzeSeries(series_id),
		})
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
				Some(format!("Analyze media item with id: {id}"))
			},
			AnalyzeMediaJobVariant::AnalyzeLibrary(id) => {
				Some(format!("Analyze library with id: {id}"))
			},
			AnalyzeMediaJobVariant::AnalyzeSeries(id) => {
				Some(format!("Analyze series with id: {id}"))
			},
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => {
				Some(format!("Analyze media group with ids: {ids:?}"))
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
				vec![AnalyzeMediaTask::FullAnalysis(id.clone())]
			},
			// For libraries we need a list of ids
			AnalyzeMediaJobVariant::AnalyzeLibrary(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(vec![media::Column::Id, media::Column::Path])
					.inner_join(series::Entity)
					.filter(series::Column::LibraryId.eq(id))
					.into_model::<media::MediaIdentSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				books
					.into_iter()
					.map(|media| AnalyzeMediaTask::FullAnalysis(media.id))
					.collect()
			},
			// We also need a list for series
			AnalyzeMediaJobVariant::AnalyzeSeries(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(vec![media::Column::Id, media::Column::Path])
					.filter(media::Column::SeriesId.eq(id))
					.into_model::<media::MediaIdentSelect>()
					.all(ctx.conn.as_ref())
					.await?;

				books
					.into_iter()
					.map(|media| AnalyzeMediaTask::FullAnalysis(media.id))
					.collect()
			},
			// Media groups already include a vector of ids
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => ids
				.iter()
				.map(|id| AnalyzeMediaTask::FullAnalysis(id.clone()))
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
				task_page_count::execute(id, ctx, &mut output).await?;
			},
			AnalyzeMediaTask::AnalyzePageDimensions(id) => {
				task_analyze_dimensions::execute(id, ctx, &mut output).await?;
			},
			AnalyzeMediaTask::FullAnalysis(id) => {
				// TODO This is suboptimal because it buffers the file twice, this should be improved later.
				// First page count needs to be updated
				task_page_count::execute(id.clone(), ctx, &mut output).await?;
				// Then we can do the dimensions analysis
				task_analyze_dimensions::execute(id, ctx, &mut output).await?;
			},
		}

		Ok(JobTaskOutput {
			output,
			subtasks: vec![],
			logs: vec![],
		})
	}
}
