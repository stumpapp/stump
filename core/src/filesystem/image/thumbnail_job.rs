use std::sync::{
	atomic::{AtomicU64, Ordering},
	Arc,
};

use serde::{Deserialize, Serialize};
use specta::Type;
use tracing::{info, trace};

use crate::{
	event::CoreEvent,
	filesystem::image::thumbnail::generate_thumbnails_for_media,
	job::{utils::persist_job_start, Job, JobError, JobTrait, JobUpdate, WorkerCtx},
	prisma::media,
};

use super::ImageProcessorOptions;

pub const THUMBNAIL_JOB_NAME: &str = "thumbnail_generation";

#[derive(Serialize, Deserialize, Type)]
pub enum ThumbnailJobConfig {
	SingleLibrary(String),
	SingleSeries(String),
	MediaGroup(Vec<String>),
}

impl ToString for ThumbnailJobConfig {
	fn to_string(&self) -> String {
		match self {
			ThumbnailJobConfig::SingleLibrary(library_id) => {
				format!("Thumbnail generation for library {}", library_id)
			},
			ThumbnailJobConfig::SingleSeries(series_id) => {
				format!("Thumbnail generation for series {}", series_id)
			},
			ThumbnailJobConfig::MediaGroup(media_group_ids) => {
				format!("Thumbnail generation for media group {:?}", media_group_ids)
			},
		}
	}
}

#[derive(Serialize, Deserialize)]
pub struct ThumbnailJob {
	options: ImageProcessorOptions,
	config: ThumbnailJobConfig,
}

#[async_trait::async_trait]
impl JobTrait for ThumbnailJob {
	fn name(&self) -> &'static str {
		THUMBNAIL_JOB_NAME
	}

	fn description(&self) -> Option<Box<&str>> {
		// TODO: figure this out...
		None
	}

	async fn run(&mut self, ctx: WorkerCtx) -> Result<u64, JobError> {
		ctx.emit_job_started(0, Some("Preparing thumbnail generation".to_string()));

		let core_ctx = ctx.core_ctx.clone();

		let counter = Arc::new(AtomicU64::new(0));
		let progress_ctx = ctx.clone();
		let job_id = progress_ctx.job_id().to_string();
		let counter_ref = counter.clone();

		let created_thumbnail_paths = match &self.config {
			ThumbnailJobConfig::SingleLibrary(_) => {
				Err(JobError::Unknown(String::from("Not yet supported!")))
			},
			ThumbnailJobConfig::SingleSeries(_) => {
				Err(JobError::Unknown(String::from("Not yet supported!")))
			},
			ThumbnailJobConfig::MediaGroup(media_group_ids) => {
				let tasks = (media_group_ids.len() as f64 / 5.0).ceil() as u64;
				let on_progress = move |msg| {
					let previous = counter_ref.fetch_add(1, Ordering::SeqCst);
					progress_ctx.emit_progress(JobUpdate::tick(
						job_id.clone(),
						previous + 1,
						tasks,
						Some(msg),
					));
				};
				persist_job_start(&core_ctx, ctx.job_id.clone(), tasks).await?;

				trace!(
					media_group_ids_count = media_group_ids.len(),
					"Generating thumbnails for media group"
				);
				let client = ctx.core_ctx.get_db();
				let media = client
					.media()
					.find_many(vec![media::id::in_vec(media_group_ids.to_owned())])
					.exec()
					.await?;
				Ok(generate_thumbnails_for_media(
					media,
					self.options.to_owned(),
					on_progress,
				)?)
			},
		}?;
		info!(
			created_thumbnail_count = created_thumbnail_paths.len(),
			"Thumbnail generation completed"
		);
		ctx.core_ctx.emit_event(CoreEvent::GeneratedThumbnailBatch(
			created_thumbnail_paths.len() as u64,
		));
		Ok(created_thumbnail_paths.len() as u64)
	}
}

impl ThumbnailJob {
	pub fn new(
		options: ImageProcessorOptions,
		config: ThumbnailJobConfig,
	) -> Box<Job<ThumbnailJob>> {
		Job::new(Self { options, config })
	}
}
