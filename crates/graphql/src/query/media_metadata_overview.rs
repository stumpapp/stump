use crate::object::media_metadata_overview::MediaMetadataOverview;
use async_graphql::{Context, Object, Result, ID};

#[derive(Default)]
pub struct MediaMetadataOverviewQuery;

#[Object]
impl MediaMetadataOverviewQuery {
	async fn media_metadata_overview(
		&self,
		_ctx: &Context<'_>,
		series_id: Option<ID>,
	) -> Result<MediaMetadataOverview> {
		Ok(MediaMetadataOverview {
			series_id: series_id.map(|id| id.to_string()),
		})
	}
}
