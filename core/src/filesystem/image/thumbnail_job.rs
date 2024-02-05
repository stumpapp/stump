use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	filesystem::{
		image::thumbnail::{
			generate_thumbnails_for_media, remove_thumbnails, THUMBNAIL_CHUNK_SIZE,
		},
		PathUtils,
	},
	job::{
		error::JobError, Job, JobDataExt, JobExt, JobRunLog, JobTaskOutput, WorkerCtx,
		WorkingState,
	},
	prisma::{media, series},
};

use super::ImageProcessorOptions;

// Note: I am type aliasing for the sake of clarity in what the provided Strings represent
type Id = String;
type MediaIds = Vec<Id>;

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum ThumbnailGenerationJobVariant {
	SingleLibrary(Id),
	SingleSeries(Id),
	MediaGroup(MediaIds),
}

#[derive(Debug, Serialize, Deserialize, Type)]
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
pub struct ThumbnailGenerationData {
	/// The total number of files that were visited during the thumbnail generation
	visited_files: u64,
	/// The number of thumbnails that were generated
	generated_thumbnails: u64,
}

impl JobDataExt for ThumbnailGenerationData {
	fn update(&mut self, updated: Self) {
		self.visited_files += updated.visited_files;
		self.generated_thumbnails += updated.generated_thumbnails;
	}
}

#[derive(Serialize, Deserialize)]
pub struct ThumbnailGenerationJob {
	pub options: ImageProcessorOptions,
	pub params: ThumbnailGenerationJobParams,
}

impl ThumbnailGenerationJob {
	pub fn new(
		options: ImageProcessorOptions,
		params: ThumbnailGenerationJobParams,
	) -> Box<Job<Self>> {
		Job::new(Self { options, params })
	}
}

#[async_trait::async_trait]
impl JobExt for ThumbnailGenerationJob {
	const NAME: &'static str = "thumbnail_generation";

	type Data = ThumbnailGenerationData;
	type Task = ThumbnailGenerationTask;

	// TODO: description based on params
	fn description(&self) -> Option<String> {
		None
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Data, Self::Task>, JobError> {
		let tasks = match &self.params.variant {
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
				let media_ids =
					library_media.into_iter().map(|m| m.id).collect::<Vec<_>>();

				media_ids
					.chunks(THUMBNAIL_CHUNK_SIZE)
					.map(|chunk| ThumbnailGenerationTask::GenerateBatch(chunk.to_vec()))
					.collect()
			},
			ThumbnailGenerationJobVariant::SingleSeries(id) => {
				let series_media = ctx
					.db
					.media()
					.find_many(vec![media::series_id::equals(Some(id.clone()))])
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;
				let media_ids =
					series_media.into_iter().map(|m| m.id).collect::<Vec<_>>();

				media_ids
					.chunks(THUMBNAIL_CHUNK_SIZE)
					.map(|chunk| ThumbnailGenerationTask::GenerateBatch(chunk.to_vec()))
					.collect()
			},
			ThumbnailGenerationJobVariant::MediaGroup(media_ids) => media_ids
				.chunks(THUMBNAIL_CHUNK_SIZE)
				.map(|chunk| ThumbnailGenerationTask::GenerateBatch(chunk.to_vec()))
				.collect(),
		};

		Ok(WorkingState {
			data: Some(Self::Data::default()),
			tasks,
			current_task_index: 0,
			logs: vec![],
		})
	}

	async fn execute_task(
		&self,
		ctx: &WorkerCtx,
		task: Self::Task,
	) -> Result<JobTaskOutput<Self>, JobError> {
		let core_config = ctx.config.clone();
		let thumbnail_dir = core_config.get_thumbnails_dir();

		let mut data = Self::Data::default();
		let mut logs = vec![];

		match task {
			ThumbnailGenerationTask::GenerateBatch(media_ids) => {
				let media = ctx
					.db
					.media()
					.find_many(vec![media::id::in_vec(media_ids)])
					.exec()
					.await
					.map_err(|e| JobError::TaskFailed(e.to_string()))?;

				let readdir_hash_set = thumbnail_dir
					.read_dir()
					.ok()
					.map(|dir| dir.into_iter())
					.map(|iter| {
						iter.filter_map(|entry| entry.ok())
							.map(|entry| entry.path().file_parts().file_name)
					})
					.map(|iter| iter.collect::<HashSet<String>>())
					.unwrap_or_default();

				if self.params.force_regenerate {
					let media_ids_to_remove = media
						.iter()
						.filter(|m| readdir_hash_set.contains(m.id.as_str()))
						.map(|m| m.id.clone())
						.collect::<Vec<String>>();
					let expected_removed = media_ids_to_remove.len() as u64;
					remove_thumbnails(&media_ids_to_remove, thumbnail_dir).map_or_else(
						|error| {
							tracing::error!(error = ?error, "Failed to remove thumbnails");
							logs.push(JobRunLog::error(format!(
								"Failed to remove thumbnails: {:?}",
								error.to_string()
							)));
						},
						|_| {
							// TODO: removed count
							data.visited_files += expected_removed;
						},
					);
				}

				let media_to_generate_thumbnails = if self.params.force_regenerate {
					media
				} else {
					media
						.into_iter()
						.filter(|m| !readdir_hash_set.contains(m.id.as_str()))
						.collect::<Vec<_>>()
				};

				generate_thumbnails_for_media(
					media_to_generate_thumbnails,
					self.options.clone(),
					&core_config,
					|_| unimplemented!("progress reporting not implemented"),
				)
				.map_or_else(
					|error| {
						tracing::error!(error = ?error, "Failed to update missing series");
						logs.push(JobRunLog::error(format!(
							"Failed to generate thumbnail batch: {:?}",
							error.to_string()
						)));
					},
					|paths| {
						let count = paths.len() as u64;
						data.visited_files += count;
						data.generated_thumbnails += count;
					},
				);
			},
		}

		Ok(JobTaskOutput {
			data,
			logs,
			subtasks: vec![],
		})
	}
}
