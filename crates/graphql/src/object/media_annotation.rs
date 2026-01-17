use async_graphql::SimpleObject;

use models::entity::media_annotation;

#[derive(Debug, SimpleObject)]
pub struct MediaAnnotation {
	#[graphql(flatten)]
	pub model: media_annotation::Model,
}

impl From<media_annotation::Model> for MediaAnnotation {
	fn from(model: media_annotation::Model) -> Self {
		Self { model }
	}
}
