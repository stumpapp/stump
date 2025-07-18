use async_graphql::InputObject;
use models::entity::series_metadata;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::{
	apply_numeric_filter, apply_string_filter, IntoFilter, NumericFilter,
	StringLikeFilter,
};

#[skip_serializing_none]
#[derive(InputObject, Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeriesMetadataFilterInput {
	#[graphql(default)]
	pub age_rating: Option<NumericFilter<i32>>,
	#[graphql(default)]
	pub meta_type: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub title: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub summary: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub publisher: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub imprint: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub comicid: Option<NumericFilter<i32>>,
	#[graphql(default)]
	pub booktype: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub volume: Option<NumericFilter<i32>>,
	#[graphql(default)]
	pub status: Option<StringLikeFilter<String>>,

	#[graphql(name = "_and", default)]
	pub _and: Option<Vec<SeriesMetadataFilterInput>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<SeriesMetadataFilterInput>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<SeriesMetadataFilterInput>>,
}

impl IntoFilter for SeriesMetadataFilterInput {
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
				self.age_rating
					.map(|f| apply_numeric_filter(series_metadata::Column::AgeRating, f)),
			)
			.add_option(
				self.meta_type
					.map(|f| apply_string_filter(series_metadata::Column::MetaType, f)),
			)
			.add_option(
				self.title
					.map(|f| apply_string_filter(series_metadata::Column::Title, f)),
			)
			.add_option(
				self.summary
					.map(|f| apply_string_filter(series_metadata::Column::Summary, f)),
			)
			.add_option(
				self.publisher
					.map(|f| apply_string_filter(series_metadata::Column::Publisher, f)),
			)
			.add_option(
				self.imprint
					.map(|f| apply_string_filter(series_metadata::Column::Imprint, f)),
			)
			.add_option(
				self.comicid
					.map(|f| apply_numeric_filter(series_metadata::Column::Comicid, f)),
			)
			.add_option(
				self.booktype
					.map(|f| apply_string_filter(series_metadata::Column::Booktype, f)),
			)
			.add_option(
				self.volume
					.map(|f| apply_numeric_filter(series_metadata::Column::Volume, f)),
			)
			.add_option(
				self.status
					.map(|f| apply_string_filter(series_metadata::Column::Status, f)),
			)
	}
}
