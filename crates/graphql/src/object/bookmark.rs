use async_graphql::SimpleObject;

use models::entity::bookmark;

#[derive(Debug, SimpleObject)]
pub struct Bookmark {
	#[graphql(flatten)]
	pub model: bookmark::Model,
}

impl From<bookmark::Model> for Bookmark {
	fn from(entity: bookmark::Model) -> Self {
		Self { model: entity }
	}
}
