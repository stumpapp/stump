use async_graphql::InputObject;
use models::entity::{author, media, media_author, series};
use sea_orm::{
	sea_query::{Query, SelectStatement},
	ColumnTrait,
};
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

use super::{apply_string_filter, IntoFilter, StringLikeFilter};

#[skip_serializing_none]
#[derive(InputObject, Clone, Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AuthorFilterInput {
	#[graphql(default)]
	pub name: Option<StringLikeFilter<String>>,

	#[graphql(default)]
	pub library_id: Option<StringLikeFilter<String>>,
	#[graphql(default)]
	pub series_id: Option<StringLikeFilter<String>>,

	pub _and: Option<Vec<AuthorFilterInput>>,
	#[graphql(name = "_not", default)]
	pub _not: Option<Vec<AuthorFilterInput>>,
	#[graphql(name = "_or", default)]
	pub _or: Option<Vec<AuthorFilterInput>>,
}

impl IntoFilter for AuthorFilterInput {
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
					.map(|f| apply_string_filter(author::Column::Name, f)),
			)
			.add_option(self.library_id.map(|f| {
				sea_orm::Condition::all()
					.add(author::Column::Id.in_subquery(library_author_subquery(f)))
			}))
		// .add_option(
		// 	self.series_id
		// 		.map(|f| apply_string_filter(media::Column::SeriesId, f)),
		// )
	}
}

fn library_author_subquery(filter: StringLikeFilter<String>) -> SelectStatement {
	let series_id_subquery = Query::select()
		.column(series::Column::Id)
		.from(series::Entity)
		.cond_where(apply_string_filter(series::Column::LibraryId, filter))
		.to_owned();

	// TODO: refactor once metadata library merges
	let media_id_subquery = Query::select()
		.column(media::Column::Id)
		.from(media::Entity)
		.and_where(media::Column::SeriesId.in_subquery(series_id_subquery))
		.to_owned();

	Query::select()
		.distinct()
		.column(media_author::Column::AuthorId)
		.from(media_author::Entity)
		.and_where(media_author::Column::MediaId.in_subquery(media_id_subquery))
		.to_owned()
}
