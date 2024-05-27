use image::GenericImageView;
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::{
	db::entity::Media,
	filesystem::{
		media::process::{get_page, get_page_count},
		ContentType,
	},
	job::{
		error::JobError, JobExt, JobOutputExt, JobTaskOutput, WorkerCtx, WorkingState,
		WrappedJob,
	},
	prisma::{media, media_metadata, series},
};

type MediaID = String;
type SeriesID = String;
type LibraryID = String;

#[derive(Clone)]
pub enum AnalyzeMediaJobVariant {
	/// Analyze an individual media item, specified by ID.
	AnalyzeSingleItem(MediaID),
	/// Analyze all media in a library, specified by library ID.
	AnalyzeLibrary(LibraryID),
	/// Analyze all media in a series, specified by series ID.
	AnalyzeSeries(SeriesID),
	/// Analyze all media in a media group, specified with a list of media IDs.
	AnalyzeMediaGroup(Vec<MediaID>),
}

#[derive(Serialize, Deserialize, Debug)]
pub enum AnalyzeMediaTask {
	/// Count the pages of a media item specified by an ID.
	UpdatePageCount(MediaID),
	/// Analyze and store dimensions for each page ofa  media item specified by an ID.
	AnalyzePageDimensions(MediaID),
}

#[derive(Clone, Serialize, Deserialize, Default, Debug, Type)]
pub struct AnalyzeMediaOutput {
	/// The number of page counts analyzed.
	page_counts_analyzed: u64,
	/// The number of images whose dimensions were analyzed.
	image_dimensions_analyzed: u64,
	/// The number of media item updates performed.
	media_updated: u64,
}

impl JobOutputExt for AnalyzeMediaOutput {
	fn update(&mut self, updated: Self) {
		self.page_counts_analyzed += updated.page_counts_analyzed;
		self.image_dimensions_analyzed += updated.image_dimensions_analyzed;
		self.media_updated += updated.media_updated;
	}
}

/// A job that analyzes a media item and updates the database
/// with information from the analysis.
#[derive(Clone)]
pub struct AnalyzeMediaJob {
	pub variant: AnalyzeMediaJobVariant,
}

impl AnalyzeMediaJob {
	/// Create a new [AnalyzeMediaJob] for the media specified by `id`.
	pub fn new(variant: AnalyzeMediaJobVariant) -> Box<WrappedJob<AnalyzeMediaJob>> {
		WrappedJob::new(Self { variant })
	}
}

#[async_trait::async_trait]
impl JobExt for AnalyzeMediaJob {
	const NAME: &'static str = "analyze_media";

	type Output = AnalyzeMediaOutput;
	type Task = AnalyzeMediaTask;

	fn description(&self) -> Option<String> {
		match &self.variant {
			AnalyzeMediaJobVariant::AnalyzeSingleItem(id) => {
				Some(format!("Analyze media item with id: {}", id))
			},
			AnalyzeMediaJobVariant::AnalyzeLibrary(id) => {
				Some(format!("Analyze library with id: {}", id))
			},
			AnalyzeMediaJobVariant::AnalyzeSeries(id) => {
				Some(format!("Analyze series with id: {}", id))
			},
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => {
				Some(format!("Analyze media group with ids: {:?}", ids))
			},
		}
	}

	async fn init(
		&mut self,
		ctx: &WorkerCtx,
	) -> Result<WorkingState<Self::Output, Self::Task>, JobError> {
		let output = Self::Output::default();

		// We match over the job variant to build a list of tasks to process
		let tasks = match &self.variant {
			// Single item is easy
			AnalyzeMediaJobVariant::AnalyzeSingleItem(id) => {
				vec![AnalyzeMediaTask::UpdatePageCount(id.clone())]
			},
			// For libraries we need a list of ids
			AnalyzeMediaJobVariant::AnalyzeLibrary(id) => {
				let library_media = ctx
					.db
					.media()
					.find_many(vec![media::series::is(vec![series::library_id::equals(
						Some(id.clone()),
					)])])
					.select(media::select!({ id }))
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				library_media
					.into_iter()
					.map(|media| AnalyzeMediaTask::UpdatePageCount(media.id))
					.collect()
			},
			// We also need a list for series
			AnalyzeMediaJobVariant::AnalyzeSeries(id) => {
				let series_media = ctx
					.db
					.media()
					.find_many(vec![media::series_id::equals(Some(id.clone()))])
					.select(media::select!({ id }))
					.exec()
					.await
					.map_err(|e| JobError::InitFailed(e.to_string()))?;

				series_media
					.into_iter()
					.map(|media| AnalyzeMediaTask::UpdatePageCount(media.id))
					.collect()
			},
			// Media groups already include a vector of ids
			AnalyzeMediaJobVariant::AnalyzeMediaGroup(ids) => ids
				.iter()
				.map(|id| AnalyzeMediaTask::UpdatePageCount(id.clone()))
				.collect(),
		};

		Ok(WorkingState {
			output: Some(output),
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

		match task {
			AnalyzeMediaTask::UpdatePageCount(id) => {
				do_update_page_count_task(id, ctx, &mut output).await?
			},
			AnalyzeMediaTask::AnalyzePageDimensions(id) => {
				do_analyze_page_dimensions_task(id, ctx, &mut output).await?
			},
		}

		Ok(JobTaskOutput {
			output,
			subtasks: vec![],
			logs: vec![],
		})
	}
}

/// The logic for [AnalyzeMediaTask::UpdatePageCount].
///
/// Determines the page count for media using media processor [get_page_count] function, then
/// performs one of:
/// 1. Updating metadata if it already exists and does not match the determined page count.
/// 2. Creates metadata if it doesn't exist and writes the determined page count.
async fn do_update_page_count_task(
	id: String,
	ctx: &WorkerCtx,
	output: &mut AnalyzeMediaOutput,
) -> Result<(), JobError> {
	// Get media by id from the database
	let media_item = fetch_media_by_id(&id, ctx).await?;

	let path = media_item.path;
	let page_count = get_page_count(&path, &ctx.config)?;
	output.page_counts_analyzed += 1;

	// Check if a metadata update is neded
	if let Some(metadata) = media_item.metadata {
		// Great, there's already metadata!
		// Check if the value matches the currently recorded one, update if not.
		if let Some(meta_page_count) = metadata.page_count {
			if meta_page_count != page_count {
				ctx.db
					.media_metadata()
					.update(
						media_metadata::media_id::equals(media_item.id),
						vec![media_metadata::page_count::set(Some(page_count))],
					)
					.exec()
					.await?;
				output.media_updated += 1;
			}
		} else {
			// Page count was `None` so we update it.
			ctx.db
				.media_metadata()
				.update(
					media_metadata::id::equals(media_item.id),
					vec![media_metadata::page_count::set(Some(page_count))],
				)
				.exec()
				.await?;
			output.media_updated += 1;
		}

		Ok(())
	} else {
		// Metadata doesn't exist, create it
		let new_metadata = ctx
			.db
			.media_metadata()
			.create(vec![
				media_metadata::id::set(media_item.id.clone()),
				media_metadata::page_count::set(Some(page_count)),
			])
			.exec()
			.await?;

		// And link it to the media item
		ctx.db
			.media()
			.update(
				media::id::equals(media_item.id),
				vec![media::metadata::connect(media_metadata::id::equals(
					new_metadata.id,
				))],
			)
			.exec()
			.await?;
		output.media_updated += 1;

		Ok(())
	}
}

/// The logic for [AnalyzeMediaTask::AnalyzePageDimensions].
///
/// Reads each page of the media item and determines its dimensions then writes them to
/// the database.
async fn do_analyze_page_dimensions_task(
	id: String,
	ctx: &WorkerCtx,
	output: &mut AnalyzeMediaOutput,
) -> Result<(), JobError> {
	// Get media by id from the database
	let media_item = fetch_media_by_id(&id, ctx).await?;

	// Get page count or error
	let page_count =
		maybe_get_page_count(&media_item).ok_or(JobError::TaskFailed(format!(
			"Unable to retrieve page count for media id: {}",
			media_item.id
		)))?;

	// Iterate over each page, checking the image's dimensions
	let mut image_dimensions: Vec<(u32, u32)> = Vec::with_capacity(page_count as usize);
	for page_num in 0..page_count {
		let (content_type, page_data) =
			get_page(&media_item.path, page_num, &ctx.config)?;
		// Confirm that content_type is compatible with the image crate
		let image_format = into_image_format(content_type)?;

		// Open image with image crate and extract dimensions
		let (height, width) =
			image::load_from_memory_with_format(&page_data, image_format)
				.map_err(|e| {
					JobError::TaskFailed(format!("Error loading image data: {}", e))
				})?
				.dimensions();

		image_dimensions.push((height, width));
		output.image_dimensions_analyzed += 1;
	}

	// TODO - Update stored page count

	Ok(())
}

/// A helper function to get page count, assuming the input [Media] has metadata and page_count is not [None].
fn maybe_get_page_count(media_item: &Media) -> Option<i32> {
	if media_item.metadata.is_none() {
		return None;
	}

	media_item.metadata.as_ref().unwrap().page_count
}

/// Convert a ContentType into an [image::ImageFormat], returning an error if the type
/// isn't compatible with the [image] crate.
pub fn into_image_format(
	content_type: ContentType,
) -> Result<image::ImageFormat, JobError> {
	match content_type {
		ContentType::PNG => Ok(image::ImageFormat::Png),
		ContentType::JPEG => Ok(image::ImageFormat::Jpeg),
		ContentType::WEBP => Ok(image::ImageFormat::WebP),
		ContentType::GIF => Ok(image::ImageFormat::Gif),
		_ => Err(JobError::TaskFailed(format!(
			"Unsupported image format: {}",
			content_type
		))),
	}
}

/// A helper function to fetch a media item by its [MediaID], including fetching the metadata
/// for the media item.
async fn fetch_media_by_id(id: &MediaID, ctx: &WorkerCtx) -> Result<Media, JobError> {
	let media_item: Media = ctx
		.db
		.media()
		.find_unique(media::id::equals(id.clone()))
		.with(media::metadata::fetch())
		.exec()
		.await
		.map_err(|e: prisma_client_rust::QueryError| JobError::TaskFailed(e.to_string()))?
		.ok_or_else(|| {
			JobError::TaskFailed(format!("Unable to find media item with id: {}", id))
		})?
		.into();

	Ok(media_item)
}
