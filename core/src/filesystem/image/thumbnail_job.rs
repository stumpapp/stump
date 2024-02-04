// use std::{
// 	path::PathBuf,
// 	sync::{
// 		atomic::{AtomicU64, Ordering},
// 		Arc,
// 	},
// };

use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	event::CoreEvent,
	filesystem::{
		image::thumbnail::{
			generate_thumbnails_for_media, remove_thumbnails, THUMBNAIL_CHUNK_SIZE,
		},
		PathUtils,
	},
	job::{
		error::JobError, Job, JobDataExt, JobExt, JobRunLog, JobTaskOutput, JobUpdate,
		WorkerCtx, WorkingState,
	},
	prisma::{media, series},
};

use super::ImageProcessorOptions;

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

#[derive(Serialize, Deserialize)]
pub enum ThumbnailGenerationTask {
	GenerateBatch(MediaIds),
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct ThumbnailGenerationJobData {
	/// The total number of files that were visited during the thumbnail generation
	visited_files: u64,
	/// The number of thumbnails that were generated
	generated_thumbnails: u64,
}

impl JobDataExt for ThumbnailGenerationJobData {
	fn update(&mut self, updated: Self) {
		self.visited_files += updated.visited_files;
		self.generated_thumbnails += updated.generated_thumbnails;
	}
}

#[derive(Serialize, Deserialize)]
pub struct ThumbnailGenerationJob {
	options: ImageProcessorOptions,
	params: ThumbnailGenerationJobParams,
}

#[async_trait::async_trait]
impl JobExt for ThumbnailGenerationJob {
	const NAME: &'static str = "thumbnail_generation";

	type Data = ThumbnailGenerationJobData;
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
					.chunks(THUMBNAIL_CHUNK_SIZE as usize)
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
					.chunks(THUMBNAIL_CHUNK_SIZE as usize)
					.map(|chunk| ThumbnailGenerationTask::GenerateBatch(chunk.to_vec()))
					.collect()
			},
			ThumbnailGenerationJobVariant::MediaGroup(media_ids) => media_ids
				.chunks(THUMBNAIL_CHUNK_SIZE as usize)
				.map(|chunk| ThumbnailGenerationTask::GenerateBatch(chunk.to_vec()))
				.collect(),
		};

		Ok(WorkingState {
			data: Some(Self::Data::default()),
			tasks,
			current_task_index: 0,
			errors: vec![],
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
		let mut errors = vec![];

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
							errors.push(JobRunLog::error(format!(
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
						errors.push(JobRunLog::error(format!(
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
			errors,
			subtasks: vec![],
		})
	}
}

// #[async_trait::async_trait]
// impl JobTrait for ThumbnailJob {
// 	fn name(&self) -> &'static str {
// 		THUMBNAIL_JOB_NAME
// 	}

// 	fn description(&self) -> Option<Box<&str>> {
// 		// TODO: figure this out...
// 		None
// 		// Some(Box::new(self.config.as_ref()))
// 	}

// 	async fn run(&mut self, ctx: WorkerCtx) -> Result<u64, JobError> {
// 		ctx.emit_job_started(0, Some("Preparing thumbnail generation".to_string()));

// 		let core_ctx = ctx.core_ctx.clone();

// 		let counter = Arc::new(AtomicU64::new(0));
// 		let progress_ctx = ctx.clone();
// 		let job_id = progress_ctx.job_id().to_string();
// 		let counter_ref = counter.clone();

// 		// FIXME: a lot of code duplication and a bit crude of an implementation. I need to account
// 		// for massive media groups better than this.
// 		let result: Result<Vec<PathBuf>, JobError> = match &self.config {
// 			ThumbnailJobConfig::SingleLibrary {
// 				library_id,
// 				force_regenerate,
// 			} => {
// let thumbnail_dir = core_ctx.config.get_thumbnails_dir();
// let library_media = core_ctx
// 	.db
// 	.media()
// 	.find_many(vec![media::series::is(vec![series::library_id::equals(
// 		Some(library_id.clone()),
// 	)])])
// 	.exec()
// 	.await?;

// 				let readdir_hash_set = thumbnail_dir
// 					.read_dir()
// 					.ok()
// 					.map(|dir| dir.into_iter())
// 					.map(|iter| {
// 						iter.filter_map(|entry| entry.ok())
// 							.map(|entry| entry.path().file_parts().file_name)
// 					})
// 					.map(|iter| iter.collect::<std::collections::HashSet<String>>())
// 					.unwrap_or_default();

// 				if *force_regenerate {
// 					remove_thumbnails(
// 						&library_media
// 							.iter()
// 							.filter(|m| readdir_hash_set.contains(&m.id))
// 							.map(|m| m.id.to_owned())
// 							.collect::<Vec<String>>(),
// 						thumbnail_dir,
// 					)?;
// 					// Generate thumbnails for all media in the library
// 					let tasks = library_media.len() as u64;
// 					let on_progress = move |msg| {
// 						let previous = counter_ref.fetch_add(5, Ordering::SeqCst);
// 						let next = if previous + THUMBNAIL_CHUNK_SIZE as u64 > tasks {
// 							tasks
// 						} else {
// 							previous + THUMBNAIL_CHUNK_SIZE as u64
// 						};
// 						progress_ctx.emit_progress(JobUpdate::tick(
// 							job_id.clone(),
// 							next,
// 							tasks,
// 							Some(msg),
// 						));
// 					};

// 					persist_job_start(&core_ctx, ctx.job_id.clone(), tasks).await?;

// 					trace!(
// 						media_count = library_media.len(),
// 						"Generating thumbnails for library"
// 					);

// 					let generated_thumbnail_paths = generate_thumbnails_for_media(
// 						library_media,
// 						self.options.to_owned(),
// 						&core_ctx.config,
// 						on_progress,
// 					)?;

// 					Ok(generated_thumbnail_paths)
// 				} else {
// 					let media_without_thumbnails = library_media
// 						.into_iter()
// 						.filter(|m| !readdir_hash_set.contains(&m.id))
// 						.collect::<Vec<media::Data>>();

// 					let tasks = media_without_thumbnails.len() as u64;
// 					let on_progress = move |msg| {
// 						let previous = counter_ref.fetch_add(5, Ordering::SeqCst);
// 						let next = if previous + THUMBNAIL_CHUNK_SIZE as u64 > tasks {
// 							tasks
// 						} else {
// 							previous + THUMBNAIL_CHUNK_SIZE as u64
// 						};
// 						progress_ctx.emit_progress(JobUpdate::tick(
// 							job_id.clone(),
// 							next,
// 							tasks,
// 							Some(msg),
// 						));
// 					};
// 					persist_job_start(&core_ctx, ctx.job_id.clone(), tasks).await?;

// 					trace!(
// 						media_count = media_without_thumbnails.len(),
// 						"Generating thumbnails for library"
// 					);
// 					let generated_thumbnail_paths = generate_thumbnails_for_media(
// 						media_without_thumbnails,
// 						self.options.to_owned(),
// 						&core_ctx.config,
// 						on_progress,
// 					)?;
// 					Ok(generated_thumbnail_paths)
// 				}
// 			},
// 			ThumbnailJobConfig::SingleSeries {
// 				series_id,
// 				force_regenerate,
// 			} => {
// 				let thumbnail_dir = core_ctx.config.get_thumbnails_dir();

// 				let series_media = core_ctx
// 					.db
// 					.media()
// 					.find_many(vec![media::series_id::equals(Some(series_id.clone()))])
// 					.exec()
// 					.await?;

// 				let readdir_hash_set = thumbnail_dir
// 					.read_dir()
// 					.ok()
// 					.map(|dir| dir.into_iter())
// 					.map(|iter| {
// 						iter.filter_map(|entry| entry.ok())
// 							.map(|entry| entry.path().file_parts().file_name)
// 					})
// 					.map(|iter| iter.collect::<std::collections::HashSet<String>>())
// 					.unwrap_or_default();

// 				if *force_regenerate {
// 					remove_thumbnails(
// 						&series_media
// 							.iter()
// 							.filter(|m| readdir_hash_set.contains(&m.id))
// 							.map(|m| m.id.to_owned())
// 							.collect::<Vec<String>>(),
// 						thumbnail_dir,
// 					)?;

// 					let tasks = series_media.len() as u64;
// 					let on_progress = move |msg| {
// 						let previous = counter_ref.fetch_add(5, Ordering::SeqCst);
// 						let next = if previous + THUMBNAIL_CHUNK_SIZE as u64 > tasks {
// 							tasks
// 						} else {
// 							previous + THUMBNAIL_CHUNK_SIZE as u64
// 						};
// 						progress_ctx.emit_progress(JobUpdate::tick(
// 							job_id.clone(),
// 							next,
// 							tasks,
// 							Some(msg),
// 						));
// 					};

// 					persist_job_start(&core_ctx, ctx.job_id.clone(), tasks).await?;

// 					trace!(
// 						media_count = series_media.len(),
// 						"Generating thumbnails for series"
// 					);

// 					let generated_thumbnail_paths = generate_thumbnails_for_media(
// 						series_media,
// 						self.options.to_owned(),
// 						&core_ctx.config,
// 						on_progress,
// 					)?;
// 					Ok(generated_thumbnail_paths)
// 				} else {
// 					let media_without_thumbnails = series_media
// 						.into_iter()
// 						.filter(|m| !readdir_hash_set.contains(&m.id))
// 						.collect::<Vec<media::Data>>();

// 					let tasks = media_without_thumbnails.len() as u64;
// 					let on_progress = move |msg| {
// 						let previous = counter_ref.fetch_add(5, Ordering::SeqCst);
// 						let next = if previous + THUMBNAIL_CHUNK_SIZE as u64 > tasks {
// 							tasks
// 						} else {
// 							previous + THUMBNAIL_CHUNK_SIZE as u64
// 						};
// 						progress_ctx.emit_progress(JobUpdate::tick(
// 							job_id.clone(),
// 							next,
// 							tasks,
// 							Some(msg),
// 						));
// 					};
// 					persist_job_start(&core_ctx, ctx.job_id.clone(), tasks).await?;

// 					trace!(
// 						media_count = media_without_thumbnails.len(),
// 						"Generating thumbnails for library"
// 					);
// 					let generated_thumbnail_paths = generate_thumbnails_for_media(
// 						media_without_thumbnails,
// 						self.options.to_owned(),
// 						&core_ctx.config,
// 						on_progress,
// 					)?;
// 					Ok(generated_thumbnail_paths)
// 				}
// 			},
// 			ThumbnailJobConfig::MediaGroup(media_group_ids) => {
// 				let tasks = media_group_ids.len() as u64;
// 				let on_progress = move |msg| {
// 					let previous = counter_ref.fetch_add(5, Ordering::SeqCst);
// 					let next = if previous + THUMBNAIL_CHUNK_SIZE as u64 > tasks {
// 						tasks
// 					} else {
// 						previous + THUMBNAIL_CHUNK_SIZE as u64
// 					};
// 					progress_ctx.emit_progress(JobUpdate::tick(
// 						job_id.clone(),
// 						next,
// 						tasks,
// 						Some(msg),
// 					));
// 				};
// 				persist_job_start(&core_ctx, ctx.job_id.clone(), tasks).await?;

// 				trace!(
// 					media_group_ids_count = media_group_ids.len(),
// 					"Generating thumbnails for media group"
// 				);
// 				let client = &ctx.core_ctx.db;
// 				let media = client
// 					.media()
// 					.find_many(vec![media::id::in_vec(media_group_ids.to_owned())])
// 					.exec()
// 					.await?;
// 				let generated_thumbnail_paths = generate_thumbnails_for_media(
// 					media,
// 					self.options.to_owned(),
// 					&core_ctx.config,
// 					on_progress,
// 				)?;
// 				Ok(generated_thumbnail_paths)
// 			},
// 		};
// 		let created_thumbnail_paths = result?;
// 		info!(
// 			created_thumbnail_count = created_thumbnail_paths.len(),
// 			"Thumbnail generation completed"
// 		);
// 		ctx.core_ctx.emit_event(CoreEvent::GeneratedThumbnailBatch(
// 			created_thumbnail_paths.len() as u64,
// 		));
// 		Ok(created_thumbnail_paths.len() as u64)
// 	}
// }

// impl ThumbnailJob {
// 	pub fn new(
// 		options: ImageProcessorOptions,
// 		config: ThumbnailJobConfig,
// 	) -> Box<Job<ThumbnailJob>> {
// 		Job::new(Self { options, config })
// 	}
// }
