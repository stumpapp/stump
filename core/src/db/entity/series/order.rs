use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::query::{OrderApplier, QueryOrder},
	prisma::{media, series},
};

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(rename_all = "snake_case")]
enum SeriesAggregateOrderBy {
	Media,
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(rename_all = "snake_case")]
enum SeriesOrderBy {
	Name,
	Description,
	UpdatedAt,
	CreatedAt,
	Path,
	Status,
	_Count(SeriesAggregateOrderBy),
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
pub struct SeriesOrdering(QueryOrder<SeriesOrderBy>);

// TODO: it would be great to cut down the duplication here...

impl<'a> OrderApplier<'a> for SeriesOrdering {
	type FindManyQuery = series::FindManyQuery<'a>;
	type FindFirstQuery = series::FindFirstQuery<'a>;

	fn apply_many(self, query: Self::FindManyQuery) -> Self::FindManyQuery {
		let direction = self.0.direction.into();

		match self.0.order_by {
			SeriesOrderBy::Name => query.order_by(series::name::order(direction)),
			SeriesOrderBy::Description => {
				query.order_by(series::description::order(direction))
			},
			SeriesOrderBy::UpdatedAt => {
				query.order_by(series::updated_at::order(direction))
			},
			SeriesOrderBy::CreatedAt => {
				query.order_by(series::created_at::order(direction))
			},
			SeriesOrderBy::Path => query.order_by(series::path::order(direction)),
			SeriesOrderBy::Status => query.order_by(series::status::order(direction)),
			SeriesOrderBy::_Count(agg) => match agg {
				SeriesAggregateOrderBy::Media => {
					query.order_by(series::media::order(vec![
						media::OrderByRelationAggregateParam::_Count(direction),
					]))
				},
			},
		}
	}

	fn apply(self, query: Self::FindFirstQuery) -> Self::FindFirstQuery {
		let direction = self.0.direction.into();

		match self.0.order_by {
			SeriesOrderBy::Name => query.order_by(series::name::order(direction)),
			SeriesOrderBy::Description => {
				query.order_by(series::description::order(direction))
			},
			SeriesOrderBy::UpdatedAt => {
				query.order_by(series::updated_at::order(direction))
			},
			SeriesOrderBy::CreatedAt => {
				query.order_by(series::created_at::order(direction))
			},
			SeriesOrderBy::Path => query.order_by(series::path::order(direction)),
			SeriesOrderBy::Status => query.order_by(series::status::order(direction)),
			SeriesOrderBy::_Count(agg) => match agg {
				SeriesAggregateOrderBy::Media => {
					query.order_by(series::media::order(vec![
						media::OrderByRelationAggregateParam::_Count(direction),
					]))
				},
			},
		}
	}
}
