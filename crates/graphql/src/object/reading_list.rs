use async_graphql::SimpleObject;

use models::entity::reading_list;

#[derive(Debug, SimpleObject)]
pub struct ReadingList {
	#[graphql(flatten)]
	pub model: reading_list::Model,
}

impl From<reading_list::Model> for ReadingList {
	fn from(entity: reading_list::Model) -> Self {
		Self { model: entity }
	}
}
