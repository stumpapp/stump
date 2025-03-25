use crate::object::media_metadata_overview::MediaMetadataOverview;
use async_graphql::{Context, Object, Result};

#[derive(Default)]
pub struct MediaMetadataOverviewQuery;

#[Object]
impl MediaMetadataOverviewQuery {
	async fn media_metadata_overview(
		&self,
		_ctx: &Context<'_>,
	) -> Result<MediaMetadataOverview> {
		Ok(MediaMetadataOverview::default())
	}
}
