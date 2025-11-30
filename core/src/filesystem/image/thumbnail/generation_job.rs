use async_graphql::SimpleObject;
use serde::{Deserialize, Serialize};

use models::{
	entity::{library, media, series},
	shared::image_processor_options::ImageProcessorOptions,
};
use sea_orm::{prelude::*, QuerySelect};

use crate::{
	filesystem::image::thumbnail::generate::{
		safely_generate_batch, GenerateImageSource, GenerateThumbnailOptions,
	},
	job::{
		error::JobError, JobExt, JobOutputExt, JobProgress, JobTaskOutput, WorkerCtx,
		WorkingState, WrappedJob,
	},
	utils::chain_optional_iter,
};

// Note: I am type aliasing for the sake of clarity in what the provided Strings represent
type Id = String;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ThumbnailGenerationJobScope {
	BooksInLibrary(Id),
	BooksInSeries(Id),
	Books(Vec<Id>),
	Libraries(Vec<Id>),
	Series(Vec<Id>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ThumbnailGenerationJobParams {
	scope: ThumbnailGenerationJobScope,
	force_regenerate: bool,
}

impl ThumbnailGenerationJobParams {
	pub fn new(scope: ThumbnailGenerationJobScope, force_regenerate: bool) -> Self {
		Self {
			scope,
			force_regenerate,
		}
	}

	pub fn books(ids: Vec<Id>, force_regenerate: bool) -> Self {
		Self::new(ThumbnailGenerationJobScope::Books(ids), force_regenerate)
	}

	pub fn books_in_library(library_id: Id, force_regenerate: bool) -> Self {
		Self::new(
			ThumbnailGenerationJobScope::BooksInLibrary(library_id),
			force_regenerate,
		)
	}

	pub fn books_in_series(series_id: Id, force_regenerate: bool) -> Self {
		Self::new(
			ThumbnailGenerationJobScope::BooksInSeries(series_id),
			force_regenerate,
		)
	}

	pub fn library(id: Id, force_regenerate: bool) -> Self {
		Self::new(
			ThumbnailGenerationJobScope::Libraries(vec![id]),
			force_regenerate,
		)
	}

	pub fn series(ids: Vec<Id>, force_regenerate: bool) -> Self {
		Self::new(ThumbnailGenerationJobScope::Series(ids), force_regenerate)
	}
}

#[derive(Serialize, Deserialize)]
pub struct ThumbnailGenerationInit {
	pub media_ids: Vec<Id>,
	pub series_ids: Vec<Id>,
	pub library_ids: Vec<Id>,
}

#[derive(Serialize, Deserialize)]
pub enum ThumbnailGenerationTask {
	Media(Vec<Id>),
	Series(Vec<Id>),
	Library(Vec<Id>),
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, SimpleObject)]
// Note: This container attribute is used to ensure future additions to the struct do not break deserialization
#[serde(default, rename_all = "camelCase")]
pub struct ThumbnailGenerationOutput {
	/// The total number of files that were visited during the thumbnail generation
	pub visited_files: u64,
	/// The number of thumbnails that were skipped (already existed and not force regenerated)
	pub skipped_files: u64,
	/// The number of thumbnails that were generated
	pub generated_thumbnails: u64,
	/// The number of thumbnails that were removed
	pub removed_thumbnails: u64,
}

impl JobOutputExt for ThumbnailGenerationOutput {
	fn update(&mut self, updated: Self) {
		self.visited_files += updated.visited_files;
		self.skipped_files += updated.skipped_files;
		self.generated_thumbnails += updated.generated_thumbnails;
		self.removed_thumbnails += updated.removed_thumbnails;
	}
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ThumbnailGenerationJob {
	pub options: ImageProcessorOptions,
	pub params: ThumbnailGenerationJobParams,
}

impl ThumbnailGenerationJob {
	pub fn new(
		options: ImageProcessorOptions,
		params: ThumbnailGenerationJobParams,
	) -> Box<WrappedJob<Self>> {
		WrappedJob::new(Self { options, params })
	}
}

#[async_trait::async_trait]
impl JobExt for ThumbnailGenerationJob {
	const NAME: &'static str = "thumbnail_generation";

	type Output = ThumbnailGenerationOutput;
	type Task = ThumbnailGenerationTask;

	// TODO: Improve this description
	fn description(&self) -> Option<String> {
		match self.params.scope.clone() {
			ThumbnailGenerationJobScope::BooksInLibrary(id) => Some(format!(
				"Thumbnail generation job, BooksInLibrary({}), force_regenerate: {}",
				id, self.params.force_regenerate
			)),
			ThumbnailGenerationJobScope::BooksInSeries(id) => Some(format!(
				"Thumbnail generation job, BooksInSeries({}), force_regenerate: {}",
				id, self.params.force_regenerate
			)),
			ThumbnailGenerationJobScope::Books(id) => Some(format!(
				"Thumbnail generation job, Books({:?}), force_regenerate: {}",
				id, self.params.force_regenerate
			)),
			ThumbnailGenerationJobScope::Libraries(ids) => Some(format!(
				"Thumbnail generation job, Libraries({:?}), force_regenerate: {}",
				ids, self.params.force_regenerate
			)),
			ThumbnailGenerationJobScope::Series(ids) => Some(format!(
				"Thumbnail generation job, Series({:?}), force_regenerate: {}",
				ids, self.params.force_regenerate
			)),
		}
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let init_params = match &self.params.scope {
			ThumbnailGenerationJobScope::BooksInLibrary(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(media::MediaThumbSelect::columns())
					.inner_join(series::Entity)
					.filter(series::Column::LibraryId.eq(id))
					.into_model::<media::MediaThumbSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;
				let media_ids = books.iter().map(|m| m.id.clone()).collect::<Vec<_>>();

				let series_ids = books
					.iter()
					.map(|m| m.series_id.clone())
					.collect::<std::collections::HashSet<_>>() // Unique
					.into_iter()
					.collect::<Vec<_>>();

				let series = series::Entity::find()
					.select_only()
					.columns(series::SeriesThumbSelect::columns())
					.filter(series::Column::Id.is_in(series_ids.clone()))
					.into_model::<series::SeriesThumbSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				let library_ids = series
					.iter()
					.filter_map(|s| s.library_id.clone())
					.collect::<std::collections::HashSet<_>>() // Unique
					.into_iter()
					.collect::<Vec<_>>();

				ThumbnailGenerationInit {
					media_ids,
					series_ids,
					library_ids,
				}
			},
			ThumbnailGenerationJobScope::BooksInSeries(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(media::MediaThumbSelect::columns())
					.filter(media::Column::SeriesId.eq(id))
					.into_model::<media::MediaIdentSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				let media_ids = books.into_iter().map(|m| m.id).collect::<Vec<_>>();

				ThumbnailGenerationInit {
					media_ids,
					series_ids: vec![id.clone()],
					library_ids: vec![],
				}
			},
			ThumbnailGenerationJobScope::Books(media_ids) => ThumbnailGenerationInit {
				media_ids: media_ids.clone(),
				series_ids: vec![],
				library_ids: vec![],
			},
			ThumbnailGenerationJobScope::Libraries(library_ids) => {
				ThumbnailGenerationInit {
					media_ids: vec![],
					series_ids: vec![],
					library_ids: library_ids.clone(),
				}
			},
			ThumbnailGenerationJobScope::Series(series_ids) => ThumbnailGenerationInit {
				media_ids: vec![],
				series_ids: series_ids.clone(),
				library_ids: vec![],
			},
		};

		let tasks = chain_optional_iter(
			[],
			[
				(!init_params.media_ids.is_empty()).then_some(
					ThumbnailGenerationTask::Media(init_params.media_ids.clone()),
				),
				(!init_params.series_ids.is_empty())
					.then_some(ThumbnailGenerationTask::Series(init_params.series_ids)),
				(!init_params.library_ids.is_empty())
					.then_some(ThumbnailGenerationTask::Library(init_params.library_ids)),
			],
		);

		Ok(WorkingState {
			output: Some(Self::Output::default()),
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
			ThumbnailGenerationTask::Media(media_ids) => {
				let media = media::Entity::find()
					.select_only()
					.columns(media::MediaThumbSelect::columns())
					.filter(media::Column::Id.is_in(media_ids))
					.into_model::<media::MediaThumbSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let task_count = media.len() as i32;
				ctx.report_progress(JobProgress::subtask_position_msg(
					"Generating book thumbnails",
					1,
					task_count,
				));
				let JobTaskOutput {
					output: sub_output,
					logs: sub_logs,
					..
				} = safely_generate_batch(
					media.into_iter().map(GenerateImageSource::Book).collect(),
					ctx,
					GenerateThumbnailOptions {
						image_options: self.options.clone(),
						core_config: ctx.config.as_ref().clone(),
						force_regen: self.params.force_regenerate,
						filename: None, // Each book will use its ID as the filename
					},
					|position| {
						ctx.report_progress(JobProgress::subtask_position(
							position as i32,
							task_count,
						));
					},
				)
				.await;
				output.update(sub_output);
				logs.extend(sub_logs);
			},
			ThumbnailGenerationTask::Series(series_ids) => {
				let series = series::Entity::find()
					.select_only()
					.columns(series::SeriesThumbSelect::columns())
					.filter(series::Column::Id.is_in(series_ids))
					.into_model::<series::SeriesThumbSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let task_count = series.len() as i32;
				ctx.report_progress(JobProgress::subtask_position_msg(
					"Generating series thumbnails",
					1,
					task_count,
				));

				let JobTaskOutput {
					output: sub_output,
					logs: sub_logs,
					..
				} = safely_generate_batch(
					series
						.into_iter()
						.map(GenerateImageSource::Series)
						.collect(),
					ctx,
					GenerateThumbnailOptions {
						image_options: self.options.clone(),
						core_config: ctx.config.as_ref().clone(),
						force_regen: self.params.force_regenerate,
						filename: None, // Each series will use its ID as the filename
					},
					|position| {
						ctx.report_progress(JobProgress::subtask_position(
							position as i32,
							task_count,
						));
					},
				)
				.await;
				output.update(sub_output);
				logs.extend(sub_logs);
			},
			ThumbnailGenerationTask::Library(library_ids) => {
				let libraries = library::Entity::find()
					.select_only()
					.columns(library::LibraryThumbSelect::columns())
					.filter(library::Column::Id.is_in(library_ids))
					.into_model::<library::LibraryThumbSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let task_count = libraries.len() as i32;
				ctx.report_progress(JobProgress::subtask_position_msg(
					"Generating library thumbnails",
					1,
					task_count,
				));

				let JobTaskOutput {
					output: sub_output,
					logs: sub_logs,
					..
				} = safely_generate_batch(
					libraries
						.into_iter()
						.map(GenerateImageSource::Library)
						.collect(),
					ctx,
					GenerateThumbnailOptions {
						image_options: self.options.clone(),
						core_config: ctx.config.as_ref().clone(),
						force_regen: self.params.force_regenerate,
						filename: None, // Each library will use its ID as the filename
					},
					|position| {
						ctx.report_progress(JobProgress::subtask_position(
							position as i32,
							task_count,
						));
					},
				)
				.await;
				output.update(sub_output);
				logs.extend(sub_logs);
			},
		}

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks: vec![],
		})
	}
}
