use async_graphql::SimpleObject;
use serde::{Deserialize, Serialize};

use models::entity::{library, media, series};
use sea_orm::{
	prelude::*, ColumnTrait, EntityTrait, QueryFilter, QuerySelect, QueryTrait,
};

use crate::{
	filesystem::image::thumbnail::generate::{
		safely_generate_placeholder_batch, GenerateImageSource,
	},
	job::{
		error::JobError, JobExt, JobOutputExt, JobProgress, JobTaskOutput, WorkerCtx,
		WorkingState, WrappedJob,
	},
	utils::chain_optional_iter,
};

// Note: Type aliasing for clarity
type Id = String;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PlaceholderGenerationJobScope {
	BooksInLibrary(Id),
	BooksInSeries(Id),
	Books(Vec<Id>),
	Libraries(Vec<Id>),
	Series(Vec<Id>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PlaceholderGenerationJobConfig {
	pub scope: PlaceholderGenerationJobScope,
	pub force_regenerate: bool,
}

impl PlaceholderGenerationJobConfig {
	pub fn new(scope: PlaceholderGenerationJobScope, force_regenerate: bool) -> Self {
		Self {
			scope,
			force_regenerate,
		}
	}
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlaceholderGenerationInit {
	pub media_ids: Vec<Id>,
	pub series_ids: Vec<Id>,
	pub library_ids: Vec<Id>,
}

#[derive(Serialize, Deserialize)]
pub enum PlaceholderGenerationTask {
	Media(Vec<Id>),
	Series(Vec<Id>),
	Library(Vec<Id>),
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, SimpleObject)]
#[serde(default, rename_all = "camelCase")]
pub struct PlaceholderGenerationOutput {
	/// The total number of entities that were visited
	pub visited_entities: u64,
	/// The number of entities that were skipped (already had metadata or no thumbnail file)
	pub skipped_entities: u64,
	/// The number of placeholder metadata entries that were generated
	pub generated_metadata: u64,
}

impl JobOutputExt for PlaceholderGenerationOutput {
	fn update(&mut self, updated: Self) {
		self.visited_entities += updated.visited_entities;
		self.skipped_entities += updated.skipped_entities;
		self.generated_metadata += updated.generated_metadata;
	}
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PlaceholderGenerationJob {
	pub config: PlaceholderGenerationJobConfig,
}

impl PlaceholderGenerationJob {
	pub fn new(config: PlaceholderGenerationJobConfig) -> PlaceholderGenerationJob {
		PlaceholderGenerationJob { config }
	}

	pub fn wrapped(self) -> Box<WrappedJob<Self>> {
		WrappedJob::new(self)
	}
}

#[async_trait::async_trait]
impl JobExt for PlaceholderGenerationJob {
	const NAME: &'static str = "placeholder_generation";

	type Output = PlaceholderGenerationOutput;
	type Task = PlaceholderGenerationTask;

	fn description(&self) -> Option<String> {
		Some(
			"Generate placeholder thumbnail metadata for media, series, or libraries"
				.to_string(),
		)
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let init_config = match &self.config.scope {
			PlaceholderGenerationJobScope::BooksInLibrary(id) => {
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
					.collect::<std::collections::HashSet<_>>()
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
					.collect::<std::collections::HashSet<_>>()
					.into_iter()
					.collect::<Vec<_>>();

				PlaceholderGenerationInit {
					media_ids,
					series_ids,
					library_ids,
				}
			},
			PlaceholderGenerationJobScope::BooksInSeries(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(media::MediaThumbSelect::columns())
					.filter(media::Column::SeriesId.eq(id))
					.into_model::<media::MediaIdentSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				let media_ids = books.into_iter().map(|m| m.id).collect::<Vec<_>>();

				PlaceholderGenerationInit {
					media_ids,
					series_ids: vec![id.clone()],
					library_ids: vec![],
				}
			},
			PlaceholderGenerationJobScope::Books(media_ids) => {
				PlaceholderGenerationInit {
					media_ids: media_ids.clone(),
					series_ids: vec![],
					library_ids: vec![],
				}
			},
			PlaceholderGenerationJobScope::Libraries(library_ids) => {
				PlaceholderGenerationInit {
					media_ids: vec![],
					series_ids: vec![],
					library_ids: library_ids.clone(),
				}
			},
			PlaceholderGenerationJobScope::Series(series_ids) => {
				PlaceholderGenerationInit {
					media_ids: vec![],
					series_ids: series_ids.clone(),
					library_ids: vec![],
				}
			},
		};

		tracing::trace!(?init_config, scope = ?self.config.scope, "Determined initial config");

		let tasks = chain_optional_iter(
			[],
			[
				(!init_config.media_ids.is_empty())
					.then_some(PlaceholderGenerationTask::Media(init_config.media_ids)),
				(!init_config.series_ids.is_empty())
					.then_some(PlaceholderGenerationTask::Series(init_config.series_ids)),
				(!init_config.library_ids.is_empty()).then_some(
					PlaceholderGenerationTask::Library(init_config.library_ids),
				),
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
		match task {
			PlaceholderGenerationTask::Media(media_ids) => {
				let media = media::Entity::find()
					.select_only()
					.columns(media::MediaThumbSelect::columns())
					.filter(media::Column::Id.is_in(media_ids))
					// If not force regenerating, then we don't care about media already having thumb meta
					.apply_if(
						(!self.config.force_regenerate)
							.then(|| media::Column::ThumbnailMeta.is_null()),
						|query, f| query.filter(f),
					)
					.into_model::<media::MediaThumbSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let task_count = media.len() as i32;
				ctx.report_progress(JobProgress::subtask_position_msg(
					"Extracting thumbnail placeholder colors",
					1,
					task_count,
				));

				Ok(safely_generate_placeholder_batch(
					media.into_iter().map(GenerateImageSource::Book).collect(),
					ctx,
					self.config.force_regenerate,
					|position| {
						ctx.report_progress(JobProgress::subtask_position(
							position as i32,
							task_count,
						));
					},
				)
				.await)
			},
			PlaceholderGenerationTask::Series(series_ids) => {
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
					"Generating series placeholder metadata",
					1,
					task_count,
				));

				Ok(safely_generate_placeholder_batch(
					series
						.into_iter()
						.map(GenerateImageSource::Series)
						.collect(),
					ctx,
					self.config.force_regenerate,
					|position| {
						ctx.report_progress(JobProgress::subtask_position(
							position as i32,
							task_count,
						));
					},
				)
				.await)
			},
			PlaceholderGenerationTask::Library(library_ids) => {
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
					"Generating library placeholder metadata",
					1,
					task_count,
				));

				Ok(safely_generate_placeholder_batch(
					libraries
						.into_iter()
						.map(GenerateImageSource::Library)
						.collect(),
					ctx,
					self.config.force_regenerate,
					|position| {
						ctx.report_progress(JobProgress::subtask_position(
							position as i32,
							task_count,
						));
					},
				)
				.await)
			},
		}
	}
}
