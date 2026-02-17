use async_graphql::SimpleObject;
use models::entity::custom_emoji;

#[derive(Debug, SimpleObject)]
pub struct CustomEmoji {
	#[graphql(flatten)]
	pub(crate) model: custom_emoji::Model,
}

impl From<custom_emoji::Model> for CustomEmoji {
	fn from(model: custom_emoji::Model) -> Self {
		Self { model }
	}
}
