use async_trait::async_trait;

use crate::{
	filesystem::image::{ImageProcessorOptions, _thumbnail::ThumbnailManager},
	job__::{worker::WorkerContext, StatefulJob},
	prisma::{media as prisma_media, series},
};

#[derive(Debug, Clone)]
pub enum ThumbnailJobParams {
	SingleLibrary {
		library_id: String,
		force_regenerate: bool,
	},
	SingleSeries {
		series_id: String,
		force_regenerate: bool,
	},
	MediaGroup(Vec<String>),
}

pub struct ThumbnailJobState {
	manager: ThumbnailManager,
	media_data: Vec<prisma_media::Data>,
	force_regenerate: bool,

	current_index: usize,
	total_items: usize,
}

pub struct ThumbnailJob {
	job_params: ThumbnailJobParams,
	options: ImageProcessorOptions,

	job_state: Option<ThumbnailJobState>,
}

#[async_trait]
impl StatefulJob for ThumbnailJob {
	fn name(&self) -> &'static str {
		"Scan Library"
	}

	async fn load_state(&mut self, ctx: &WorkerContext) {
		let manager = ThumbnailManager::new(ctx.config.clone())
			.expect("Failed to create ThumbnailManager");

		// Track whether or not we'll be regenerating thumbnails that already exist
		let should_force_regenerate;
		// Get media to be processed
		let mut media_data = match self.job_params.clone() {
			ThumbnailJobParams::SingleLibrary {
				library_id,
				force_regenerate,
			} => {
				should_force_regenerate = force_regenerate;
				// Load library media to be processed
				get_library_media(library_id, ctx).await
			},
			ThumbnailJobParams::SingleSeries {
				series_id,
				force_regenerate,
			} => {
				should_force_regenerate = force_regenerate;
				// Load series media to be processed
				get_series_media(series_id, ctx).await
			},
			ThumbnailJobParams::MediaGroup(items) => {
				should_force_regenerate = false;
				// Load media group media to be processed
				get_media_group_media(items, ctx).await
			},
		};

		// If we aren't overwriting thumbnails, then we only need to generate
		// thumbnails for the media items that aren't already in the directory.
		if !should_force_regenerate {
			media_data = media_data
				.into_iter()
				.filter(|media| !manager.has_thumbnail(&media.id))
				.collect::<Vec<prisma_media::Data>>();
		}

		// Set job state so that it can be mutated in do_work
		let total_items = media_data.len();
		self.job_state = Some(ThumbnailJobState {
			manager,
			media_data,
			force_regenerate: should_force_regenerate,
			current_index: 0,
			total_items,
		});
	}

	async fn save_state(&self, ctx: &WorkerContext) {
		todo!()
	}

	async fn do_work(&mut self, ctx: &WorkerContext) {
		// Return if already finished
		if self.is_finished() {
			return;
		}

		// State must be loaded before the job can do work, so the else block
		// below will trigger a load_state and return.
		if let Some(state) = &mut self.job_state {
			// Get a reference to the media item we're processing
			let item = state.media_data.get(state.current_index).unwrap();

			// Remove thumbnails if necessary
			if state.force_regenerate && state.manager.has_thumbnail(&item.id) {
				match state.manager.remove_thumbnail(&item.id) {
					Ok(_) => (),
					Err(e) => tracing::trace!("Failed deleting thumnail: {}", e),
				}
			}

			// Generate thumbnail for current item
			state
				.manager
				.generate_thumbnail(item, self.options.clone())
				.expect("Failed to generate thumbnail, wtf?");

			// Increase current_index
			state.current_index += 1;
		} else {
			self.load_state(ctx).await;
		}
	}

	fn get_progress(&self) -> f64 {
		// If job_state is None then we haven't started yet
		if let Some(job_state) = &self.job_state {
			if job_state.total_items > 0 {
				let current_index = job_state.current_index as f64;
				let end_index = (job_state.total_items - 1) as f64;

				return current_index / end_index;
			} else {
				// A zero item job is done already
				return 1.0;
			}
		}

		// Return when job_state is None.
		return 0.0;
	}
}

impl ThumbnailJob {
	pub fn new(params: ThumbnailJobParams, options: ImageProcessorOptions) -> Self {
		Self {
			job_params: params,
			options,
			job_state: None,
		}
	}
}

/// Helper function that gets a vector of [media::Data] with the input
/// `library_id`.
pub async fn get_library_media(
	library_id: String,
	ctx: &WorkerContext,
) -> Vec<prisma_media::Data> {
	ctx.db
		.media()
		.find_many(vec![prisma_media::series::is(vec![
			series::library_id::equals(Some(library_id)),
		])])
		.exec()
		.await
		.expect("There was a library load error")
}

/// Helper function that gets a vector of [media::Data] with the input
/// `series_id`.
pub async fn get_series_media(
	series_id: String,
	ctx: &WorkerContext,
) -> Vec<prisma_media::Data> {
	ctx.db
		.media()
		.find_many(vec![prisma_media::series_id::equals(Some(series_id))])
		.exec()
		.await
		.expect("There was a library load error")
}

/// Helper function that gets a vector of [media::Data] based on the input
/// vector of media group ids.
pub async fn get_media_group_media(
	media_group_ids: Vec<String>,
	ctx: &WorkerContext,
) -> Vec<prisma_media::Data> {
	ctx.db
		.media()
		.find_many(vec![prisma_media::id::in_vec(media_group_ids)])
		.exec()
		.await
		.expect("There was a library load error")
}
