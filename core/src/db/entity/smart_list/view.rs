use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::entity::common::{ReactTableColumnSort, ReactTableGlobalSort},
	prisma::smart_list_view,
	CoreError,
};

#[derive(Default, Clone, Debug, Deserialize, Serialize, Type, ToSchema)]
pub struct SmartListView {
	/// The name of the view. The name is unique per list
	name: String,
	/// The id of the list this view belongs to
	list_id: String,

	#[serde(flatten)]
	config: SmartListViewConfig,
}

#[derive(Default, Clone, Debug, Deserialize, Serialize, Type, ToSchema)]

pub struct SmartListViewConfig {
	/// The columns present in the book table(s)
	book_columns: Vec<ReactTableColumnSort>,
	/// The columns present in the grouping entity table
	group_columns: Vec<ReactTableColumnSort>,
	/// The sorting state of the book table(s)
	#[serde(rename = "book_sorting")]
	book_sorting_state: Option<Vec<ReactTableGlobalSort>>,
	/// The sorting state of the grouping entity table view
	#[serde(rename = "group_sorting")]
	group_sorting_state: Option<Vec<ReactTableGlobalSort>>,
	/// Whether the table view allows multi-sorting
	#[serde(default)]
	#[specta(optional)]
	enable_multi_sort: Option<bool>,
	/// A filter that is applied by default to the table
	#[serde(default)]
	#[specta(optional)]
	search: Option<String>,
}

impl TryFrom<smart_list_view::Data> for SmartListView {
	type Error = CoreError;

	fn try_from(value: smart_list_view::Data) -> Result<Self, Self::Error> {
		let config =
			serde_json::from_slice::<SmartListViewConfig>(&value.data).map_err(|e| {
				tracing::error!(?e, "Failed to deserialize smart list view config");
				CoreError::InternalError(e.to_string())
			})?;

		Ok(Self {
			name: value.name,
			list_id: value.list_id,
			config,
		})
	}
}
