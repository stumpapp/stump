use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{
	db::query::QueryOrder,
	prisma::{library, series},
};

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(rename_all = "snake_case")]
enum LibraryAggregateOrderBy {
	Media,
	Series,
}

#[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
#[serde(rename_all = "snake_case")]
enum LibraryOrderBy {
	Name,
	Path,
	Status,
	UpdatedAt,
	CreatedAt,
	_Count(LibraryAggregateOrderBy),
}

pub struct LibraryOrdering(QueryOrder<LibraryOrderBy>);

impl LibraryOrdering {
	pub fn apply_many(self, query: library::FindManyQuery) -> library::FindManyQuery {
		let direction = self.0.direction.into();

		match self.0.order_by {
			LibraryOrderBy::Name => query.order_by(library::name::order(direction)),
			LibraryOrderBy::Path => query.order_by(library::path::order(direction)),
			LibraryOrderBy::Status => query.order_by(library::status::order(direction)),
			LibraryOrderBy::UpdatedAt => {
				query.order_by(library::updated_at::order(direction))
			},
			LibraryOrderBy::CreatedAt => {
				query.order_by(library::created_at::order(direction))
			},
			LibraryOrderBy::_Count(agg) => match agg {
				LibraryAggregateOrderBy::Media => {
					// query.order_by(library::series::order(vec![
					// 	series::OrderByRelationAggregateParam::_Count(direction),
					// ]))
					unimplemented!("I'm not sure if this is supported yet?")
				},
				LibraryAggregateOrderBy::Series => {
					query.order_by(library::series::order(vec![
						series::OrderByRelationAggregateParam::_Count(direction),
					]))
				},
			},
		}
	}

	pub fn apply(self, query: library::FindFirstQuery) -> library::FindFirstQuery {
		let direction = self.0.direction.into();

		match self.0.order_by {
			LibraryOrderBy::Name => query.order_by(library::name::order(direction)),
			LibraryOrderBy::Path => query.order_by(library::path::order(direction)),
			LibraryOrderBy::Status => query.order_by(library::status::order(direction)),
			LibraryOrderBy::UpdatedAt => {
				query.order_by(library::updated_at::order(direction))
			},
			LibraryOrderBy::CreatedAt => {
				query.order_by(library::created_at::order(direction))
			},
			LibraryOrderBy::_Count(agg) => match agg {
				LibraryAggregateOrderBy::Media => {
					unimplemented!("I'm not sure if this is supported yet?")
				},
				LibraryAggregateOrderBy::Series => {
					query.order_by(library::series::order(vec![
						series::OrderByRelationAggregateParam::_Count(direction),
					]))
				},
			},
		}
	}
}
