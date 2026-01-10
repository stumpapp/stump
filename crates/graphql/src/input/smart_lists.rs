use async_graphql::{Enum, InputObject, OneofObject, Result};
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

impl Default for SmartListsInput {
	fn default() -> Self {
		SmartListsInput {
			all: None,
			mine: Some(true),
			search: None,
		}
	}
}

/// The different filter joiners that can be used in smart lists
#[derive(
	PartialEq, Eq, Copy, Hash, Debug, Clone, Default, Enum, Serialize, Deserialize,
)]
pub enum SmartListGroupJoiner {
	#[default]
	And,
	Or,
	Not,
}

#[allow(clippy::large_enum_variant)]
#[derive(OneofObject, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SmartListFilterInput {
	Media(MediaFilterInput),
	MediaMetadata(MediaMetadataFilterInput),
	Series(SeriesFilterInput),
	SeriesMetadata(SeriesMetadataFilterInput),
	Library(LibraryFilterInput),
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct SmartListFilterGroupInput {
	pub groups: Vec<SmartListFilterInput>,
	pub joiner: SmartListGroupJoiner,
}

#[derive(Clone, InputObject)]
pub struct SaveSmartListInput {
	pub filters: Vec<SmartListFilterGroupInput>,
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
