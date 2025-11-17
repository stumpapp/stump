use async_graphql::SimpleObject;
use futures::{stream::FuturesUnordered, StreamExt};
use serde::{Deserialize, Serialize};

use models::{
	entity::{library, media, series},
	shared::image_processor_options::ImageProcessorOptions,
};
use sea_orm::{prelude::*, QuerySelect};

use crate::{
	job::{
		error::JobError, JobExecuteLog, JobExt, JobOutputExt, JobProgress, JobTaskOutput,
		WorkerCtx, WorkingState, WrappedJob,
	},
	utils::chain_optional_iter,
};

use super::generate::{generate_book_thumbnail, GenerateThumbnailOptions};

// Note: I am type aliasing for the sake of clarity in what the provided Strings represent
type Id = String;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ThumbnailGenerationJobVariant {
	SingleLibrary(Id),
	SingleSeries(Id),
	MediaGroup(Vec<Id>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ThumbnailGenerationJobParams {
	variant: ThumbnailGenerationJobVariant,
	force_regenerate: bool,
}

impl ThumbnailGenerationJobParams {
	pub fn new(variant: ThumbnailGenerationJobVariant, force_regenerate: bool) -> Self {
		Self {
			variant,
			force_regenerate,
		}
	}

	pub fn single_library(library_id: Id, force_regenerate: bool) -> Self {
		Self::new(
			ThumbnailGenerationJobVariant::SingleLibrary(library_id),
			force_regenerate,
		)
	}

	pub fn single_series(series_id: Id, force_regenerate: bool) -> Self {
		Self::new(
			ThumbnailGenerationJobVariant::SingleSeries(series_id),
			force_regenerate,
		)
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
	visited_files: u64,
	/// The number of thumbnails that were skipped (already existed and not force regenerated)
	skipped_files: u64,
	/// The number of thumbnails that were generated
	generated_thumbnails: u64,
	/// The number of thumbnails that were removed
	removed_thumbnails: u64,
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

	fn description(&self) -> Option<String> {
		match self.params.variant.clone() {
			ThumbnailGenerationJobVariant::SingleLibrary(id) => Some(format!(
				"Thumbnail generation job, SingleLibrary({}), force_regenerate: {}",
				id, self.params.force_regenerate
			)),
			ThumbnailGenerationJobVariant::SingleSeries(id) => Some(format!(
				"Thumbnail generation job, SingleSeries({}), force_regenerate: {}",
				id, self.params.force_regenerate
			)),
			ThumbnailGenerationJobVariant::MediaGroup(id) => Some(format!(
				"Thumbnail generation job, MediaGroup({:?}), force_regenerate: {}",
				id, self.params.force_regenerate
			)),
		}
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let init_params = match &self.params.variant {
			ThumbnailGenerationJobVariant::SingleLibrary(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(vec![media::Column::Id, media::Column::Path])
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
			ThumbnailGenerationJobVariant::SingleSeries(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(vec![media::Column::Id, media::Column::Path])
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
			ThumbnailGenerationJobVariant::MediaGroup(media_ids) => {
				ThumbnailGenerationInit {
					media_ids: media_ids.clone(),
					series_ids: vec![],
					library_ids: vec![],
				}
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
					.columns(vec![media::Column::Id, media::Column::Path])
					.filter(media::Column::Id.is_in(media_ids))
					.into_model::<media::MediaIdentSelect>()
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
					media,
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
					.columns(series::SeriesIdentSelect::columns())
					.filter(series::Column::Id.is_in(series_ids))
					.into_model::<series::SeriesIdentSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let task_count = series.len() as i32;
				ctx.report_progress(JobProgress::subtask_position_msg(
					"Generating series thumbnails",
					1,
					task_count,
				));

				todo!("Series thumbnail generation not yet implemented");
			},
			ThumbnailGenerationTask::Library(library_ids) => {
				let libraries = library::Entity::find()
					.select_only()
					.columns(library::LibraryIdentSelect::columns())
					.filter(library::Column::Id.is_in(library_ids))
					.into_model::<library::LibraryIdentSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let task_count = libraries.len() as i32;
				ctx.report_progress(JobProgress::subtask_position_msg(
					"Generating library thumbnails",
					1,
					task_count,
				));

				tracing::warn!("Library thumbnail generation not yet implemented");
			},
		}

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks: vec![],
		})
	}
}

// TODO(thumb-placeholders): Make intake an enum of either (Media/Series/Library)IdentSelect and match for the inner
// futures. I don't think we need to clone the whole safely_generate_batch function for each type, just things like
// generate_book_thumbnail vs generate_series_thumbnail, etc.
// What I imagine for each at a high level is something like:
// generate_{series/library}_thumbnail -> get "default" thumbnail from first book -> check if exists -> generate thumbnail -> save to series record
// The thing to note is that there is an implied ordering for this job in that books always get run first, so we should be able to safely assume if force_regen was
// true it would have been handled in the book thumbnail generation step. So we don't need to regen, just check if it exists and update the mapping in the database
#[tracing::instrument(skip_all)]
pub async fn safely_generate_batch(
	books: Vec<media::MediaIdentSelect>,
	ctx: &WorkerCtx,
	options: GenerateThumbnailOptions,
	reporter: impl Fn(usize),
) -> JobTaskOutput<ThumbnailGenerationJob> {
	let mut output = ThumbnailGenerationOutput::default();
	let mut logs = vec![];

	let max_concurrency = options.core_config.max_thumbnail_concurrency;
	let batch_size = max_concurrency;
	let total_books = books.len();
	tracing::debug!(batch_size, total_books, "Processing thumbnails in batches");

	let mut processed_count = 0;

	for (chunk_index, chunk) in books.chunks(batch_size).enumerate() {
		let mut chunk_futures = FuturesUnordered::new();

		tracing::trace!(
			chunk_index,
			chunk_size = chunk.len(),
			"Processing thumbnail generation batch"
		);

		for (book_index, book) in chunk.iter().enumerate() {
			let options = options.clone();
			let path = book.path.clone();

			let future = async move {
				tracing::trace!(?path, "(Chunk {chunk_index}, Book {book_index}) Starting thumbnail generation");

				let result = generate_book_thumbnail(book, ctx.conn.as_ref(), options)
					.await
					.map(|(_, path, did_generate)| (path, did_generate));

				result.map_err(|e| (e, path))
			};

			chunk_futures.push(future);
		}

		while let Some(gen_output) = chunk_futures.next().await {
			match gen_output {
				Ok((_, did_generate)) => {
					if did_generate {
						output.generated_thumbnails += 1;
					} else {
						output.skipped_files += 1;
					}
				},
				Err((error, path)) => {
					logs.push(
						JobExecuteLog::error(format!(
							"Failed to generate thumbnail: {:?}",
							error.to_string()
						))
						.with_ctx(format!("Media path: {path}")),
					);
				},
			}

			output.visited_files += 1;
			processed_count += 1;
			reporter(processed_count);
		}

		// TODO: Read up more on this, I added as an attempt to force garbage collection
		// between batches to help with memory usage, but it may not be necessary.
		if processed_count < total_books {
			tokio::task::yield_now().await;
		}
	}

	JobTaskOutput {
		output,
		logs,
		subtasks: vec![],
	}
}
