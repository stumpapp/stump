use async_graphql::{InputObject, Result, ID};
use models::entity::smart_list_view;
use sea_orm::{NotSet, Set};

#[derive(Default, Clone, InputObject)]
pub struct SaveSmartListViewInput {
	pub name: String,
	pub list_id: ID,
	pub config: String,
}

impl SaveSmartListViewInput {
	pub fn into_active_model(self) -> Result<smart_list_view::ActiveModel> {
		Ok(smart_list_view::ActiveModel {
			id: NotSet,
			list_id: Set(self.list_id.to_string()),
			name: Set(self.name),
			// TODO(graphql): handle config properly
			data: Set(self.config.into_bytes()),
			..Default::default()
		})
	}
}
