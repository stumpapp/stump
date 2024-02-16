use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	job::{
		error::JobError, JobExecuteLog, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx,
		WorkingState, WrappedJob,
	},
	prisma::{media, series},
};

use super::{manager::ThumbnailManager, ImageProcessorOptions};

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

#[derive(Clone, Serialize, Deserialize, Default, Debug, Type)]
pub struct ThumbnailGenerationOutput {
	/// The total number of files that were visited during the thumbnail generation
	visited_files: u64,
	/// The number of thumbnails that were generated
	generated_thumbnails: u64,
	/// The number of thumbnails that were removed
	removed_thumbnails: u64,
}

impl JobOutputExt for ThumbnailGenerationOutput {
	fn update(&mut self, updated: Self) {
		self.visited_files += updated.visited_files;
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

	// TODO: description based on params
	fn description(&self) -> Option<String> {
		None
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let media_ids = match &self.params.variant {
			ThumbnailGenerationJobVariant::SingleLibrary(id) => {
				let library_media = ctx
					.db
					.media()
					.find_many(vec![media::series::is(vec![series::library_id::equals(
						Some(id.clone()),
					)])])
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				library_media.into_iter().map(|m| m.id).collect::<Vec<_>>()
			},
			ThumbnailGenerationJobVariant::SingleSeries(id) => {
				let series_media = ctx
					.db
					.media()
					.find_many(vec![media::series_id::equals(Some(id.clone()))])
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				series_media.into_iter().map(|m| m.id).collect::<Vec<_>>()
			},
			ThumbnailGenerationJobVariant::MediaGroup(media_ids) => media_ids.clone(),
		};

		let manager = ThumbnailManager::new(ctx.config.clone())
			.map_err(|e| JobError::TaskFailed(e.to_string()))?;

		let media_ids = if !self.params.force_regenerate {
			// if we aren't force regenerating, we can skip the init if all media already have thumbnails
			media_ids
				.into_iter()
				.filter(|id| !manager.has_thumbnail(id.as_str()))
				.collect::<Vec<_>>()
		} else {
			media_ids
		};

		let tasks = media_ids
			.chunks(100)
			.map(|chunk| ThumbnailGenerationTask::GenerateBatch(chunk.to_vec()))
			.collect();

		Ok(WorkingState {
			output: Some(Self::Output::default()),
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
		let mut output = Self::Output::default();
		let mut logs = vec![];

		let mut manager = ThumbnailManager::new(ctx.config.clone())
			.map_err(|e| JobError::TaskFailed(e.to_string()))?;

		match task {
			ThumbnailGenerationTask::GenerateBatch(media_ids) => {
				let media = ctx
					.db
					.media()
					.find_many(vec![media::id::in_vec(media_ids)])
					.exec()
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				if self.params.force_regenerate {
					let media_ids_to_remove = media
						.iter()
						.filter(|m| manager.has_thumbnail(m.id.as_str()))
						.map(|m| m.id.clone())
						.collect::<Vec<String>>();
					let JobTaskOutput {
						output: sub_output,
						logs: sub_logs,
						..
					} = safely_remove_batch(&media_ids_to_remove, &mut manager);
					output.update(sub_output);
					logs.extend(sub_logs);
				}

				let media_to_generate_thumbnails = if self.params.force_regenerate {
					media
				} else {
					media
						.into_iter()
						.filter(|m| !manager.has_thumbnail(m.id.as_str()))
						.collect::<Vec<_>>()
				};

				let JobTaskOutput {
					output: sub_output,
					logs: sub_logs,
					..
				} = safely_generate_batch(
					&media_to_generate_thumbnails,
					self.options.clone(),
					&mut manager,
				);
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

pub fn safely_remove_batch<S: AsRef<str>>(
	ids: &[S],
	manager: &mut ThumbnailManager,
) -> JobTaskOutput<ThumbnailGenerationJob> {
	let mut output = ThumbnailGenerationOutput::default();
	let mut logs = vec![];

	for id in ids {
		manager.remove_thumbnail(id).map_or_else(
			|error| {
				tracing::error!(error = ?error, "Failed to remove thumbnail");
				logs.push(
					JobExecuteLog::error(format!(
						"Failed to remove thumbnail: {:?}",
						error.to_string()
					))
					.with_ctx(format!("Media ID: {}", id.as_ref())),
				);
			},
			|_| output.removed_thumbnails += 1,
		);
	}
	output.visited_files = ids.len() as u64;

	JobTaskOutput {
		output,
		logs,
		subtasks: vec![],
	}
}

pub fn safely_generate_batch(
	media: &[media::Data],
	options: ImageProcessorOptions,
	manager: &mut ThumbnailManager,
) -> JobTaskOutput<ThumbnailGenerationJob> {
	let mut output = ThumbnailGenerationOutput::default();
	let mut logs = vec![];

	// let manager_arc = Arc::

	// media
	// 	.par_iter()
	// 	.for_each_with(manager, |inner_manager, media| {});

	// TODO: introduce a parallel version of this, it is too slow sequentially like this
	for media_item in media {
		manager
			.generate_thumbnail(media_item, options.clone())
			.map_or_else(
				|error| {
					tracing::error!(error = ?error, "Failed to generate thumbnail");
					logs.push(
						JobExecuteLog::error(format!(
							"Failed to generate thumbnail: {:?}",
							error.to_string()
						))
						.with_ctx(format!("Media ID: {}", media_item.id)),
					);
				},
				|_| output.generated_thumbnails += 1,
			);
	}
	output.visited_files = media.len() as u64;

	JobTaskOutput {
		output,
		logs,
		subtasks: vec![],
	}
}
