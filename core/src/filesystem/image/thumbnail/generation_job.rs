use async_graphql::SimpleObject;
use futures::{stream::FuturesUnordered, StreamExt};
use serde::{Deserialize, Serialize};

use models::{
	entity::{media, series},
	shared::image_processor_options::ImageProcessorOptions,
};
use sea_orm::{prelude::*, QuerySelect};

use crate::job::{
	error::JobError, JobExecuteLog, JobExt, JobOutputExt, JobProgress, JobTaskOutput,
	WorkerCtx, WorkingState, WrappedJob,
};

use super::generate::{generate_book_thumbnail, GenerateThumbnailOptions};

// Note: I am type aliasing for the sake of clarity in what the provided Strings represent
type Id = String;
type MediaIds = Vec<Id>;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ThumbnailGenerationJobVariant {
	SingleLibrary(Id),
	SingleSeries(Id),
	MediaGroup(MediaIds),
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
pub enum ThumbnailGenerationTask {
	GenerateBatch(MediaIds),
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
		let media_ids = match &self.params.variant {
			ThumbnailGenerationJobVariant::SingleLibrary(id) => {
				let books = media::Entity::find()
					.select_only()
					.columns(vec![media::Column::Id, media::Column::Path])
					.inner_join(series::Entity)
					.filter(series::Column::LibraryId.eq(id))
					.into_model::<media::MediaIdentSelect>()
					.all(ctx.conn.as_ref())
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				books.into_iter().map(|m| m.id).collect::<Vec<_>>()
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

				books.into_iter().map(|m| m.id).collect::<Vec<_>>()
			},
			ThumbnailGenerationJobVariant::MediaGroup(media_ids) => media_ids.clone(),
		};

		Ok(WorkingState {
			output: Some(Self::Output::default()),
			tasks: vec![ThumbnailGenerationTask::GenerateBatch(media_ids)].into(),
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
			ThumbnailGenerationTask::GenerateBatch(media_ids) => {
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
					"Generating thumbnails",
					1,
					task_count,
				));
				let JobTaskOutput {
					output: sub_output,
					logs: sub_logs,
					..
				} = safely_generate_batch(
					media,
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
		}

		Ok(JobTaskOutput {
			output,
			logs,
			subtasks: vec![],
		})
	}
}

#[tracing::instrument(skip_all)]
pub async fn safely_generate_batch(
	books: Vec<media::MediaIdentSelect>,
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

		// Note: This originally spawned a bunch of futures all at once and then just
		// kept them waiting until the semaphore was available. I've refactored this
		// to use chunking as a potential solve for https://github.com/stumpapp/stump/issues/671.
		// TODO: Port this to the develop branch and ask for feedback on whether it improves the situation.
		// TODO: ^ Depending on outcome, definitely need to revisit ALL of the scanner logic since it also had that pattern
		for (book_index, book) in chunk.iter().enumerate() {
			let options = options.clone();
			let path = book.path.clone();

			let future = async move {
				tracing::trace!(?path, "(Chunk {chunk_index}, Book {book_index}) Starting thumbnail generation");

				let result = generate_book_thumbnail(book, options)
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
