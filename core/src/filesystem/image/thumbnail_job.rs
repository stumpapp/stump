use serde::{Deserialize, Serialize};
use tracing::info;

use crate::{
	filesystem::image::thumbnail::generate_thumbnails_for_media,
	job::{Job, JobError, JobTrait, WorkerCtx},
	prisma::media,
};

use super::ImageProcessorOptions;

pub const THUMBNAIL_JOB_NAME: &str = "thumbnail_generation";

#[derive(Serialize, Deserialize)]
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
		let created_thumbnail_paths = match &self.config {
			ThumbnailJobConfig::SingleLibrary(_) => {
				Err(JobError::Unknown(String::from("Not yet supported!")))
			},
			ThumbnailJobConfig::SingleSeries(_) => {
				Err(JobError::Unknown(String::from("Not yet supported!")))
			},
			ThumbnailJobConfig::MediaGroup(media_group_ids) => {
				// TODO: move this elsewhere
				let client = ctx.core_ctx.get_db();
				let media = client
					.media()
					.find_many(vec![media::id::in_vec(media_group_ids.to_owned())])
					.exec()
					.await?;
				Ok(generate_thumbnails_for_media(
					media,
					self.options.to_owned(),
				)?)
			},
		}?;
		info!(
			created_thumbnail_count = created_thumbnail_paths.len(),
			"Thumbnail generation completed"
		);
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
