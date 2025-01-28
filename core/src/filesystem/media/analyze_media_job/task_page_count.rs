use crate::{
	filesystem::{
		analyze_media_job::{utils::fetch_media_with_metadata, AnalyzeMediaOutput},
		media::process::get_page_count_async,
	},
	job::{error::JobError, WorkerCtx},
	prisma::{media, media_metadata},
};

/// The logic for [`super::AnalyzeMediaTask::UpdatePageCount`].
///
/// Determines the page count for media using media processor [`get_page_count_async`] function, then
/// performs one of:
/// 1. Updating metadata if it already exists and does not match the determined page count, or
/// 2. Creating metadata if it doesn't exist and writes the determined page count.
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
	let media_item = fetch_media_with_metadata(&id, ctx).await?;

	let path = media_item.path;
	let page_count = get_page_count_async(&path, &ctx.config).await?;
	output.page_counts_analyzed += 1;

	// Check if a metadata update is needed
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
					media_metadata::media_id::equals(media_item.id),
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
