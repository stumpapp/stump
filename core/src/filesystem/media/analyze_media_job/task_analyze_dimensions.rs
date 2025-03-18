use image::GenericImageView;

use crate::{
	filesystem::media::{analyze_media_job::AnalyzeMediaOutput, process::get_page},
	job::{error::JobError, JobProgress, WorkerCtx},
};
use models::{
	entity::{media, media_metadata, page_dimension},
	shared::page_dimension::{PageAnalysis, PageDimension},
};
use sea_orm::{prelude::*, FromQueryResult, JoinType, QuerySelect};

#[derive(Debug, FromQueryResult)]
struct MediaWithDimensions {
	id: String,
	path: String,
	pages: i32,
	page_count: Option<i32>,
	page_analysis: Option<PageAnalysis>,
}

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
	let media_item = media::Entity::find()
		.select_only()
		.columns(vec![
			media::Column::Id,
			media::Column::Path,
			media::Column::Pages,
		])
		.column(media_metadata::Column::PageCount)
		.left_join(media_metadata::Entity)
		.join_rev(
			JoinType::LeftJoin,
			page_dimension::Entity::belongs_to(media_metadata::Entity)
				.from(page_dimension::Column::MetadataId)
				.to(media_metadata::Column::Id)
				.into(),
		)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<MediaWithDimensions>()
		.one(ctx.conn.as_ref())
		.await
		.map_err(|e| JobError::TaskFailed(e.to_string()))?
		.ok_or_else(|| {
			JobError::TaskFailed(format!("Unable to find media item with id: {id}"))
		})?;

	// Get page count if present
	let page_count = media_item.page_count.unwrap_or(media_item.pages);

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

	let update_expr = match media_item.page_analysis {
		Some(PageAnalysis { dimensions }) if dimensions != image_dimensions => {
			Expr::value(PageAnalysis {
				dimensions: image_dimensions,
			})
		},
		None => Expr::value(PageAnalysis {
			dimensions: image_dimensions,
		}),
		_ => return Ok(()),
	};

	media_metadata::Entity::update_many()
		.filter(media_metadata::Column::Id.eq(media_item.id))
		.col_expr(media_metadata::Column::PageAnalysis, update_expr)
		.exec(ctx.conn.as_ref())
		.await?;

	Ok(())
}
