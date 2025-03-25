use crate::object::media_metadata::MediaMetadata;
use async_graphql::{Context, Object, Result};

#[derive(Default)]
pub struct MediaMetadataQuery;

#[Object]
impl MediaMetadataQuery {
	async fn media_metadata(&self, _ctx: &Context<'_>) -> Result<MediaMetadata> {
		Ok(MediaMetadata::default())
	}
}
