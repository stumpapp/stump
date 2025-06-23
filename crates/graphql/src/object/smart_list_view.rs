use async_graphql::{ComplexObject, Result, SimpleObject};
use models::entity::smart_list_view;

#[derive(Debug, SimpleObject)]
#[graphql(complex)]
pub struct SmartListView {
	#[graphql(flatten)]
	pub model: smart_list_view::Model,
}

impl From<smart_list_view::Model> for SmartListView {
	fn from(entity: smart_list_view::Model) -> Self {
		Self { model: entity }
	}
}

#[ComplexObject]
impl SmartListView {
	async fn config(&self) -> Result<String> {
		//TODO(graphql): Implement deserialization of config
		unimplemented!("Config serialization is not implemented yet");
	}
}
