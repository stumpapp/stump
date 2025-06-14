use async_graphql::{InputObject, Result};
use models::{
	entity::smart_list::{SmartListGrouping, SmartListJoiner},
	shared::enums::EntityVisibility,
};
use sea_orm::{prelude::*, ActiveValue::Set};
use serde::{Deserialize, Serialize};

use crate::filter::{
	library::LibraryFilterInput, media::MediaFilterInput,
	media_metadata::MediaMetadataFilterInput, series::SeriesFilterInput,
	series_metadata::SeriesMetadataFilterInput,
};

#[derive(InputObject)]
pub struct SmartListsInput {
	pub all: Option<bool>,
	pub mine: Option<bool>,
	pub search: Option<String>,
}

#[derive(Default, InputObject, Clone, Serialize, Deserialize)]
pub struct SmartListFilterInput {
	pub media: Option<MediaFilterInput>,
	pub media_metadata: Option<MediaMetadataFilterInput>,
	pub series: Option<SeriesFilterInput>,
	pub series_metadata: Option<SeriesMetadataFilterInput>,
	pub library: Option<LibraryFilterInput>,
}

#[derive(Default, Clone, InputObject)]
pub struct SaveSmartListInput {
	pub filters: Vec<SmartListFilterInput>,
	pub name: String,
	pub description: Option<String>,
	pub joiner: SmartListJoiner,
	pub default_grouping: SmartListGrouping,
	pub visibility: EntityVisibility,
}

impl SaveSmartListInput {
	pub fn into_active_model(
		self,
		user_id: &str,
	) -> Result<models::entity::smart_list::ActiveModel> {
		Ok(models::entity::smart_list::ActiveModel {
			id: Set(Uuid::new_v4().to_string()),
			name: Set(self.name),
			description: Set(self.description),
			filters: Set(serde_json::to_vec(&self.filters)?),
			joiner: Set(self.joiner),
			default_grouping: Set(self.default_grouping),
			visibility: Set(self.visibility),
			creator_id: Set(user_id.to_string()),
		})
	}
}
