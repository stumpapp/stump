use crate::{
	db::entity::page_dimension::{dimension_vec_to_string, PageDimension},
	filesystem::{
		analyze_media_job::{utils::fetch_media_with_dimensions, AnalyzeMediaOutput},
		media::process::get_page_dimensions,
	},
	job::{error::JobError, WorkerCtx},
	prisma::{media_metadata, page_dimensions},
};

// TODO: exclude EPUB (and potentially PDF) from this task. It isn't an error, per se, but it just doesn't make
// much sense to calculate dimensions for these types of files.

/// The logic for [super::AnalyzeMediaTask::AnalyzePageDimensions].
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
		// let (_content_type, page_data) =
		// 	get_page(&media_item.path, page_num, &ctx.config)?;
		// // Open image with imagesize crate and extract dimensions
		// let (height, width): (u32, u32) = imagesize::blob_size(&page_data[..20])
		// 	.map(
		// 		|size| match (u32::try_from(size.height), u32::try_from(size.width)) {
		// 			(Ok(height), Ok(width)) => Ok((height, width)),
		// 			_ => Err("Image dimensions too large or misread"),
		// 		},
		// 	)
		// 	.map_err(|e| {
		// 		JobError::TaskFailed(format!("Error loading image data: {}", e))
		// 	})?
		// 	.unwrap();
		let (height, width) =
			get_page_dimensions(&media_item.path, page_num, &ctx.config)?;
		image_dimensions.push(PageDimension { height, width });
		output.image_dimensions_analyzed += 1;
	}

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
