use async_graphql::{InputObject, Result, SimpleObject, ID};
use models::entity::smart_list_view;
use sea_orm::{NotSet, Set};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, SimpleObject, InputObject, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[graphql(input_name = "SmartListViewSortInput")]
pub struct SmartListViewSort {
	pub id: String,
	pub desc: bool,
}

#[derive(Debug, Clone, SimpleObject, InputObject, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[graphql(input_name = "SmartListViewColumnInput")]
pub struct SmartListViewColumn {
	pub id: String,
	pub position: i32,
}

#[derive(Debug, Clone, SimpleObject, InputObject, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[graphql(input_name = "SmartListViewConfigInput")]
pub struct SmartListViewConfig {
	pub book_columns: Vec<SmartListViewColumn>,
	pub group_columns: Vec<SmartListViewColumn>,
	pub book_sorting: Vec<SmartListViewSort>,
	pub group_sorting: Vec<SmartListViewSort>,
	pub enable_multi_sort: Option<bool>,
	pub search: Option<String>,
}

#[derive(Clone, InputObject)]
pub struct SaveSmartListView {
	pub name: String,
	pub list_id: ID,
	#[graphql(flatten)]
	pub config: SmartListViewConfig,
}

impl SaveSmartListView {
	pub fn into_active_model(self) -> Result<smart_list_view::ActiveModel> {
		let value = serde_json::to_vec(&self.config)
			.map_err(|_| "Failed to serialize view".to_string())?;
		Ok(smart_list_view::ActiveModel {
			id: NotSet,
			list_id: Set(self.list_id.to_string()),
			name: Set(self.name),
			data: Set(value),
		})
	}
}
