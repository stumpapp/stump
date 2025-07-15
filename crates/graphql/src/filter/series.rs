use async_graphql::InputObject;
use models::entity::series;
use serde::{Deserialize, Serialize};

use super::{
	apply_string_filter, library::LibraryFilterInput,
	series_metadata::SeriesMetadataFilterInput, IntoFilter, StringLikeFilter,
};

// TODO: Support filter by tags (requires join logic)

#[derive(InputObject, Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeriesFilterInput {
	#[graphql(default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub name: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub path: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub library_id: Option<StringLikeFilter<String>>,

	#[graphql(default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub metadata: Option<SeriesMetadataFilterInput>,
	#[graphql(default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub library: Option<LibraryFilterInput>,

	#[graphql(name = "_and", default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub _and: Option<Vec<SeriesFilterInput>>,
	#[graphql(name = "_not", default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub _not: Option<Vec<SeriesFilterInput>>,
	#[graphql(name = "_or", default)]
	#[serde(skip_serializing_if = "Option::is_none")]
	pub _or: Option<Vec<SeriesFilterInput>>,
}

impl IntoFilter for SeriesFilterInput {
	fn into_filter(self) -> sea_orm::Condition {
		sea_orm::Condition::all()
			.add_option(self._and.map(|f| {
				let mut and_condition = sea_orm::Condition::all();
				for filter in f {
					and_condition = and_condition.add(filter.into_filter());
				}
				and_condition
			}))
			.add_option(self._not.map(|f| {
				let mut not_condition = sea_orm::Condition::any();
				for filter in f {
					not_condition = not_condition.add(filter.into_filter());
				}
				not_condition.not()
			}))
			.add_option(self._or.map(|f| {
				let mut or_condition = sea_orm::Condition::any();
				for filter in f {
					or_condition = or_condition.add(filter.into_filter());
				}
				or_condition
			}))
			.add_option(
				self.name
					.map(|f| apply_string_filter(series::Column::Name, f)),
			)
			.add_option(
				self.path
					.map(|f| apply_string_filter(series::Column::Path, f)),
			)
			.add_option(
				self.library_id
					.map(|f| apply_string_filter(series::Column::LibraryId, f)),
			)
			.add_option(self.metadata.map(|f| f.into_filter()))
			.add_option(self.library.map(|f| f.into_filter()))
	}
}
