use async_graphql::InputObject;
use models::entity::log;

use super::{apply_string_filter, IntoFilter, StringLikeFilter};

#[derive(InputObject, Clone, Default)]
pub struct LogFilterInput {
	#[graphql(default)]
	pub level: Option<StringLikeFilter<String>>,

	#[graphql(default)]
	pub job_id: Option<StringLikeFilter<String>>,

	#[graphql(name = "_and", default)]
	pub _and: Option<Vec<LogFilterInput>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<LogFilterInput>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<LogFilterInput>>,
}

impl IntoFilter for LogFilterInput {
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
				self.level
					.map(|f| apply_string_filter(log::Column::Level, f)),
			)
			.add_option(
				self.job_id
					.map(|f| apply_string_filter(log::Column::JobId, f)),
			)
	}
}
