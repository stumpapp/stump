use async_graphql::InputObject;
use models::entity::library;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::{apply_string_filter, IntoFilter, StringLikeFilter};

// TODO: Support filter by tags (requires join logic)

#[skip_serializing_none]
#[derive(InputObject, Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFilterInput {
	#[graphql(default)]
	pub id: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub name: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub path: Option<StringLikeFilter<String>>,

	#[graphql(name = "_and", default)]
	pub _and: Option<Vec<LibraryFilterInput>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<LibraryFilterInput>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<LibraryFilterInput>>,
}

impl IntoFilter for LibraryFilterInput {
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
					.map(|f| apply_string_filter(library::Column::Name, f)),
			)
			.add_option(
				self.path
					.map(|f| apply_string_filter(library::Column::Path, f)),
			)
	}
}
