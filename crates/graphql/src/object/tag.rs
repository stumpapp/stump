use async_graphql::SimpleObject;
use models::entity::tag;

#[derive(Debug, SimpleObject)]
pub struct Tag {
	#[graphql(flatten)]
	pub model: tag::Model,
}

impl From<tag::Model> for Tag {
	fn from(entity: tag::Model) -> Self {
		Self { model: entity }
	}
}
