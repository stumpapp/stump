use crate::{
	filesystem::{
		analyze_media_job::AnalyzeMediaOutput, media::process::get_page_count_async,
	},
	job::{error::JobError, WorkerCtx},
};
use models::entity::{media, media_metadata};
use sea_orm::{prelude::*, FromQueryResult, Iterable, QuerySelect, Set};

#[derive(Debug, FromQueryResult)]
struct MediaIdentWithMeta {
	id: String,
	path: String,
	#[sea_orm(nested)]
	metadata: Option<media_metadata::Model>,
}

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
	let media_item = media::Entity::find()
		.select_only()
		.columns(vec![media::Column::Id, media::Column::Path])
		.columns(media_metadata::Column::iter())
		.left_join(media_metadata::Entity)
		.filter(media::Column::Id.eq(id.clone()))
		.into_model::<MediaIdentWithMeta>()
		.one(ctx.conn.as_ref())
		.await
		.map_err(|e| JobError::TaskFailed(e.to_string()))?
		.ok_or_else(|| {
			JobError::TaskFailed(format!("Unable to find media item with id: {id}"))
		})?;

	let path = media_item.path;
	let page_count = get_page_count_async(&path, &ctx.config).await?;
	output.page_counts_analyzed += 1;

	// Check if a metadata update is needed
	if let Some(metadata) = media_item.metadata {
		// Great, there's already metadata!

		let should_update = match metadata.page_count {
			Some(meta_page_count) => meta_page_count != page_count,
			None => true,
		};

		if should_update {
			let rows_affected = media_metadata::Entity::update_many()
				.filter(media_metadata::Column::MediaId.eq(media_item.id.clone()))
				.col_expr(media_metadata::Column::PageCount, Expr::value(page_count))
				.exec(ctx.conn.as_ref())
				.await?
				.rows_affected;

			output.media_updated += rows_affected;
		}

		Ok(())
	} else {
		// Metadata doesn't exist, create it
		let metadata = media_metadata::ActiveModel {
			media_id: Set(Some(media_item.id.clone())),
			page_count: Set(Some(page_count)),
			..Default::default()
		};
		media_metadata::Entity::insert(metadata)
			.exec(ctx.conn.as_ref())
			.await?;

		output.media_updated += 1;

		Ok(())
	}
}
