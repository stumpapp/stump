use image::GenericImageView;

use crate::{
	db::entity::resolution::{resolution_vec_to_string, Resolution},
	filesystem::{
		analyze_media_job::{
			utils::{fetch_media_with_resolutions, into_image_format},
			AnalyzeMediaOutput,
		},
		media::process::get_page,
	},
	job::{error::JobError, WorkerCtx},
	prisma::{media_metadata, page_resolutions},
};

/// The logic for [AnalyzeMediaTask::AnalyzePageDimensions].
///
/// Reads each page of the media item and determines its dimensions then writes them to
/// the database.
///
/// # Arguments
/// * `id` - The id for the media item being analyzed
/// * `ctx` - A reference to the [WorkerCtx] for the job
/// * `output` - A mutable reference to the job output
pub(crate) async fn execute(
	id: String,
	ctx: &WorkerCtx,
	output: &mut AnalyzeMediaOutput,
) -> Result<(), JobError> {
	// Get media by id from the database
	let media_item = fetch_media_with_resolutions(&id, ctx).await?;

	// Get metadata if present
	let metadata = media_item.metadata.ok_or_else(|| {
		JobError::TaskFailed(format!(
			"Unable to retrieve metadata for media item: {}",
			media_item.id
		))
	})?;
	// Get page count if present
	let page_count = metadata.page_count.ok_or_else(|| {
		JobError::TaskFailed(format!(
			"Unable to retrieve page count for media item: {}",
			media_item.id
		))
	})?;

	// Iterate over each page, checking the image's dimensions
	let mut image_dimensions: Vec<Resolution> = Vec::with_capacity(page_count as usize);
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

		image_dimensions.push(Resolution { height, width });
		output.image_dimensions_analyzed += 1;
	}

	// Update stored page count
	// Check if resolutions are stored already or not yet stored
	if let Some(current_resolutions) = metadata.page_resolutions {
		// There are already resolutions, we only need to update them if there's a mismatch
		if current_resolutions.resolutions != image_dimensions {
			// Serialize collected resolutions
			let resolutions_str = resolution_vec_to_string(image_dimensions);

			ctx.db
				.page_resolutions()
				.update(
					page_resolutions::id::equals(current_resolutions.id),
					vec![page_resolutions::resolutions::set(resolutions_str)],
				)
				.exec()
				.await?;
		}
		todo!()
	} else {
		// There is no resolution data, we need to create a new database object for them
		// Serialize collected resolutions
		let resolutions_str = resolution_vec_to_string(image_dimensions);

		// Create a new resolution database object
		let resolutions_entity = ctx
			.db
			.page_resolutions()
			.create(
				resolutions_str,
				media_metadata::media_id::equals(metadata.id.clone()),
				vec![],
			)
			.exec()
			.await?;

		// Link it to the media's metadata
		ctx.db
			.media_metadata()
			.update(
				media_metadata::id::equals(metadata.id),
				vec![media_metadata::page_resolutions::connect(
					page_resolutions::id::equals(resolutions_entity.id),
				)],
			)
			.exec()
			.await?;
	}

	Ok(())
}
