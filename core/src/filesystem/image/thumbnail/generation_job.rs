use std::{
	pin::pin,
	sync::{
		atomic::{AtomicUsize, Ordering},
		Arc,
	},
};

use async_graphql::SimpleObject;
use futures::{stream::FuturesUnordered, StreamExt};
use serde::{Deserialize, Serialize};
use specta::Type;
use tokio::sync::Semaphore;

use models::{
	entity::{media, series},
	shared::image_processor_options::ImageProcessorOptions,
};
use sea_orm::{prelude::*, QuerySelect};

use crate::job::{
	error::JobError, JobExecuteLog, JobExt, JobOutputExt, JobProgress, JobTaskOutput,
	WorkerCtx, WorkingState, WrappedJob,
};

use super::{
	generate::{generate_book_thumbnail, GenerateThumbnailOptions},
	ThumbnailGenerateError,
};

// Note: I am type aliasing for the sake of clarity in what the provided Strings represent
type Id = String;
type MediaIds = Vec<Id>;

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum ThumbnailGenerationJobVariant {
	SingleLibrary(Id),
	SingleSeries(Id),
	MediaGroup(MediaIds),
}

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
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

#[derive(Clone, Serialize, Deserialize, Default, Debug, Type, SimpleObject)]
// Note: This container attribute is used to ensure future additions to the struct do not break deserialization
#[serde(default)]
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
	let semaphore = Arc::new(Semaphore::new(max_concurrency));
	tracing::debug!(
		max_concurrency,
		"Semaphore created for thumbnail generation"
	);

	let futures = books
		.iter()
		.map(|book| {
			let semaphore = semaphore.clone();
			let options = options.clone();
			let path = book.path.clone();

			async move {
				if semaphore.available_permits() == 0 {
					tracing::trace!(?path, "Waiting for permit for thumbnail generation");
				}
				let _permit = semaphore.acquire().await.map_err(|e| {
					(ThumbnailGenerateError::Unknown(e.to_string()), path.clone())
				})?;
				tracing::trace!(?path, "Acquired permit for thumbnail generation");
				generate_book_thumbnail(book, options)
					.await
					.map_err(|e| (e, path))
			}
		})
		.collect::<FuturesUnordered<_>>();

	// An atomic usize to keep track of the current position in the stream
	// to report progress to the UI
	let atomic_cursor = Arc::new(AtomicUsize::new(1));

	let mut futures = pin!(futures);

	while let Some(gen_output) = futures.next().await {
		match gen_output {
			Ok((_, _, did_generate)) => {
				if did_generate {
					output.generated_thumbnails += 1;
				} else {
					// If we didn't generate a thumbnail, and have a success result,
					// then we skipped it
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
		// We visit every file, regardless of success or failure
		output.visited_files += 1;
		reporter(atomic_cursor.fetch_add(1, Ordering::SeqCst));
	}

	JobTaskOutput {
		output,
		logs,
		subtasks: vec![],
	}
}
