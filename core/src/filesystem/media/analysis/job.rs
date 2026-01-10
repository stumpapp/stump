use crate::{
	filesystem::media::analysis::analyze::{safely_analyze_book, MediaForProcessing},
	job::{
		error::JobError, JobExt, JobOutputExt, JobProgress, JobTaskOutput, WorkerCtx,
		WorkingState, WrappedJob,
	},
};
use models::entity::{media, media_analysis, media_metadata, series};
use sea_orm::{prelude::*, QuerySelect};
use serde::{Deserialize, Serialize};

type Id = String;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum MediaAnalysisJobScope {
	/// Analyze an individual media item, specified by ID
	Book(Id),
	/// Analyze a batch of media items, specified by a list of IDs
	Books(Vec<Id>),
	/// Analyze all media in a library, specified by library ID
	Library(Id),
	/// Analyze all media in a series, specified by series ID
	Series(Id),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AnalysisJobConfig {
	pub scope: MediaAnalysisJobScope,
	pub force_reanalysis: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub enum AnalyzeMediaTask {
	ProcessBook(Id),
}

#[derive(Clone, Serialize, Deserialize, Default, Debug)]
pub struct AnalyzeMediaOutput {
	/// The number of pages in total that were analyzed to some extent
	pub pages_analyzed: u64,
	/// The number of media item updates performed
	pub media_updated: u64,
}

impl JobOutputExt for AnalyzeMediaOutput {
	fn update(&mut self, updated: Self) {
		self.pages_analyzed += updated.pages_analyzed;
		self.media_updated += updated.media_updated;
	}
}

/// A job that analyzes a media item and updates the database
/// with information from the analysis.
#[derive(Clone)]
pub struct AnalyzeMediaJob {
	pub config: AnalysisJobConfig,
}

impl AnalyzeMediaJob {
	pub fn new(config: AnalysisJobConfig) -> Self {
		Self { config }
	}

	pub fn wrapped(self) -> Box<WrappedJob<Self>> {
		WrappedJob::new(self)
	}
}

#[async_trait::async_trait]
impl JobExt for AnalyzeMediaJob {
	const NAME: &'static str = "analyze_media";

	type Output = AnalyzeMediaOutput;
	type Task = AnalyzeMediaTask;

	fn description(&self) -> Option<String> {
		match &self.config.scope {
			MediaAnalysisJobScope::Book(id) => {
				Some(format!("Analyze media item with id: {id}"))
			},
			MediaAnalysisJobScope::Library(id) => {
				Some(format!("Analyze library with id: {id}"))
			},
			MediaAnalysisJobScope::Series(id) => {
				Some(format!("Analyze series with id: {id}"))
			},
			MediaAnalysisJobScope::Books(ids) => {
				Some(format!("Analyze media group with ids: {ids:?}"))
			},
		}
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let output = Self::Output::default();

		let tasks = match &self.config.scope {
			MediaAnalysisJobScope::Book(id) => {
				vec![AnalyzeMediaTask::ProcessBook(id.clone())]
			},
			MediaAnalysisJobScope::Library(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(media::MediaIdentSelect::columns())
					.inner_join(series::Entity)
					.filter(series::Column::LibraryId.eq(id))
					.into_model::<media::MediaIdentSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				books
					.into_iter()
					.map(|media| AnalyzeMediaTask::ProcessBook(media.id))
					.collect()
			},
			MediaAnalysisJobScope::Series(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(media::MediaIdentSelect::columns())
					.filter(media::Column::SeriesId.eq(id))
					.into_model::<media::MediaIdentSelect>()
					.all(ctx.conn.as_ref())
					.await?;

				books
					.into_iter()
					.map(|media| AnalyzeMediaTask::ProcessBook(media.id))
					.collect()
			},
			MediaAnalysisJobScope::Books(ids) => ids
				.iter()
				.map(|id| AnalyzeMediaTask::ProcessBook(id.clone()))
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
		let mut logs = vec![];

		match task {
			AnalyzeMediaTask::ProcessBook(id) => {
				let (book, existing_analysis) = media::Entity::find()
					.select_only()
					.columns(vec![
						media::Column::Id,
						media::Column::Path,
						media::Column::Pages,
					])
					.column(media_metadata::Column::PageCount)
					.left_join(media_metadata::Entity)
					.find_also_related(media_analysis::Entity)
					.filter(media::Column::Id.eq(id.clone()))
					.into_model::<MediaForProcessing, media_analysis::Model>()
					.one(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?
					.ok_or_else(|| {
						JobError::TaskFailed(format!(
							"Unable to find media item with id: {id}"
						))
					})?;

				let filename = std::path::Path::new(&book.path)
					.file_name()
					.and_then(|n| n.to_str())
					.unwrap_or(&book.path);
				ctx.report_progress(JobProgress::msg(&format!("Analyzing {}", filename)));

				let JobTaskOutput {
					output: sub_output,
					logs: sub_logs,
					..
				} = safely_analyze_book(
					book,
					existing_analysis.map(|a| a.data),
					ctx,
					self.config.force_reanalysis,
				)
				.await;
				output.update(sub_output);
				logs.extend(sub_logs);
			},
		}

		Ok(JobTaskOutput {
			output,
			subtasks: vec![],
			logs,
		})
	}
}
