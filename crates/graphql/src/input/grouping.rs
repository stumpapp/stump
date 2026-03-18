use async_graphql::{InputObject, OneofObject};
use models::entity::{media, media_metadata};

pub use media::MediaModelGroupBy;
pub use media_metadata::MediaMetadataModelGroupBy;

#[derive(OneofObject, Clone)]
pub enum GroupingLevel {
	Media(media::MediaModelGroupBy),
	MediaMetadata(media_metadata::MediaMetadataModelGroupBy),
}

#[derive(InputObject, Clone, Default)]
pub struct GroupingPathInput {
	pub levels: Vec<GroupingLevel>,
}
