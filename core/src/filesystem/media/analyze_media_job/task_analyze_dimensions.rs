use image::GenericImageView;

use crate::{
	db::entity::page_dimension::{dimension_vec_to_string, PageDimension},
	filesystem::{
		analyze_media_job::{utils::fetch_media_with_dimensions, AnalyzeMediaOutput},
		media::process::get_page,
	},
	job::{error::JobError, JobProgress, WorkerCtx},
	prisma::{media_metadata, page_dimensions},
};

/// The logic for [`super::AnalyzeMediaTask::AnalyzePageDimensions`].
///
/// Reads each page of the media item and determines its dimensions then writes them to
/// the database.
///
/// # Arguments
/// * `id` - The id for the media item being analyzed
/// * `ctx` - A reference to the [`WorkerCtx`] for the job
/// * `output` - A mutable reference to the job output
pub(crate) async fn execute(
	id: String,
	ctx: &WorkerCtx,
	output: &mut AnalyzeMediaOutput,
) -> Result<(), JobError> {
	// Get media by id from the database
	let media_item = fetch_media_with_dimensions(&id, ctx).await?;

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
	let mut image_dimensions: Vec<PageDimension> =
		Vec::with_capacity(page_count as usize);

	for page_num in 1..=page_count {
		ctx.report_progress(JobProgress::subtask_position_msg(
			"Extracting image dimensions",
			page_num,
			page_count,
		));

		let (content_type, page_data) =
			get_page(&media_item.path, page_num, &ctx.config)?;
		// Confirm that content_type is compatible with the image crate
		let image_format = content_type.try_into()?;

		// Open image with image crate and extract dimensions
		let (width, height) =
			image::load_from_memory_with_format(&page_data, image_format)
				.map_err(|e| {
					JobError::TaskFailed(format!("Error loading image data: {e}"))
				})?
				.dimensions();

		image_dimensions.push(PageDimension { height, width });
		output.image_dimensions_analyzed += 1;
	}

	ctx.report_progress(JobProgress::msg("Writing to database"));

	// Update stored page count
	// Check if dimensions are stored already or not yet stored
	if let Some(current_dimensions) = metadata.page_dimensions {
		// There are already dimensions, we only need to update them if there's a mismatch
		if current_dimensions.dimensions != image_dimensions {
			// Serialize collected dimensions
			let dimensions_str = dimension_vec_to_string(image_dimensions);

			ctx.db
				.page_dimensions()
				.update(
					page_dimensions::id::equals(current_dimensions.id),
					vec![page_dimensions::dimensions::set(dimensions_str)],
				)
				.exec()
				.await?;
		}
	} else {
		// There is no dimensions data, we need to create a new database object for them
		// Serialize collected dimensions
		let dimensions_str = dimension_vec_to_string(image_dimensions);

		// Create a new dimensions database object
		let dimensions_entity = ctx
			.db
			.page_dimensions()
			.create(
				dimensions_str,
				media_metadata::id::equals(metadata.id.clone()),
				vec![],
			)
			.exec()
			.await?;

		// Link it to the media's metadata
		ctx.db
			.media_metadata()
			.update(
				media_metadata::id::equals(metadata.id),
				vec![media_metadata::page_dimensions::connect(
					page_dimensions::id::equals(dimensions_entity.id),
				)],
			)
			.exec()
			.await?;
	}

	Ok(())
}
