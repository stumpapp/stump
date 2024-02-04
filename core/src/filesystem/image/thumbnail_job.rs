// use std::{
// 	path::PathBuf,
// 	sync::{
// 		atomic::{AtomicU64, Ordering},
// 		Arc,
// 	},
// };

// use serde::{Deserialize, Serialize};
// use specta::Type;
// use tracing::{info, trace};

// use crate::{
// 	event::CoreEvent,
// 	filesystem::{
// 		image::thumbnail::{
// 			generate_thumbnails_for_media, remove_thumbnails, THUMBNAIL_CHUNK_SIZE,
// 		},
// 		PathUtils,
// 	},
// 	job::{Job, JobError, JobTrait, JobUpdate, WorkerCtx},
// 	prisma::{media, series},
// };

// use super::ImageProcessorOptions;

// pub const THUMBNAIL_JOB_NAME: &str = "thumbnail_generation";

// #[derive(Debug, Serialize, Deserialize, Type)]
// pub enum ThumbnailJobConfig {
// 	SingleLibrary {
// 		library_id: String,
// 		force_regenerate: bool,
// 	},
// 	SingleSeries {
// 		series_id: String,
// 		force_regenerate: bool,
// 	},
// 	MediaGroup(Vec<String>),
// }

// impl ToString for ThumbnailJobConfig {
// 	fn to_string(&self) -> String {
// 		match self {
// 			ThumbnailJobConfig::SingleLibrary { library_id, .. } => {
// 				format!("Thumbnail generation for library {}", library_id)
// 			},
// 			ThumbnailJobConfig::SingleSeries { series_id, .. } => {
// 				format!("Thumbnail generation for series {}", series_id)
// 			},
// 			ThumbnailJobConfig::MediaGroup(media_group_ids) => {
// 				format!("Thumbnail generation for media group {:?}", media_group_ids)
// 			},
// 		}
// 	}
// }

// // impl AsRef<str> for ThumbnailJobConfig {
// // 	fn as_ref(&self) -> &str {
// // 		match self {
// // 			ThumbnailJobConfig::SingleLibrary { library_id, .. } => {
// // 				format!("Thumbnail generation for library {}", library_id).as_str()
// // 			},
// // 			ThumbnailJobConfig::SingleSeries { series_id, .. } => {
// // 				format!("Thumbnail generation for series {}", series_id).as_str()
// // 			},
// // 			ThumbnailJobConfig::MediaGroup(media_group_ids) => {
// // 				format!("Thumbnail generation for media group {:?}", media_group_ids)
// // 					.as_str()
// // 			},
// // 		}
// // 	}
// // }

// #[derive(Serialize, Deserialize)]
// pub struct ThumbnailJob {
// 	options: ImageProcessorOptions,
// 	config: ThumbnailJobConfig,
// }

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
// 				let thumbnail_dir = core_ctx.config.get_thumbnails_dir();
// 				let library_media = core_ctx
// 					.db
// 					.media()
// 					.find_many(vec![media::series::is(vec![series::library_id::equals(
// 						Some(library_id.clone()),
// 					)])])
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
