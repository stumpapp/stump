use image::GenericImageView;

use crate::{
	filesystem::{
		analyze_media_job::{
			utils::{
				fetch_media_with_resolutions, into_image_format, maybe_get_page_count,
			},
			AnalyzeMediaOutput,
		},
		media::process::get_page,
	},
	job::{error::JobError, WorkerCtx},
};

/// The logic for [AnalyzeMediaTask::AnalyzePageDimensions].
///
/// Reads each page of the media item and determines its dimensions then writes them to
/// the database.
pub(crate) async fn do_task(
	id: String,
	ctx: &WorkerCtx,
	output: &mut AnalyzeMediaOutput,
) -> Result<(), JobError> {
	// Get media by id from the database
	let media_item = fetch_media_with_resolutions(&id, ctx).await?;

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
