use async_graphql::{Result, SimpleObject};
use models::entity::smart_list_view;

use crate::input::smart_list_view::SmartListViewConfig;

#[derive(Debug, SimpleObject)]
pub struct SmartListView {
	#[graphql(flatten)]
	pub model: smart_list_view::Model,

	#[graphql(flatten)]
	pub config: SmartListViewConfig,
}

impl SmartListView {
	pub fn try_from(entity: smart_list_view::Model) -> Result<Self> {
		let config = serde_json::from_slice(&entity.data)?;

		Ok(Self {
			model: entity,
			config,
		})
	}
}
