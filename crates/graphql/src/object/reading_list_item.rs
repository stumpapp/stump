use async_graphql::SimpleObject;

use models::entity::reading_list_item;

#[derive(Debug, SimpleObject)]
pub struct ReadingListItem {
	#[graphql(flatten)]
	pub model: reading_list_item::Model,
}

impl From<reading_list_item::Model> for ReadingListItem {
	fn from(entity: reading_list_item::Model) -> Self {
		Self { model: entity }
	}
}
