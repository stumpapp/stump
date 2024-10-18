use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::SortOrder;

pub trait IntoOrderBy {
	type OrderParam;
	fn into_prisma_order(self, dir: SortOrder) -> Self::OrderParam;
}

#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, Type, ToSchema)]
pub enum Direction {
	#[serde(rename = "asc")]
	Asc,
	#[serde(rename = "desc")]
	#[default]
	Desc,
}

// This is cool and all, but implies only one order can be applied. Realistically, we can do things
// like:
// media::find_many(vec![params]).order_by(media::metadata::order(vec![media_metadata::title::order(SortOrder::Asc)])).order_by(media::name::order(SortOrder::Asc))

impl From<Direction> for SortOrder {
	fn from(direction: Direction) -> SortOrder {
		match direction {
			Direction::Asc => SortOrder::Asc,
			Direction::Desc => SortOrder::Desc,
		}
	}
}

#[derive(Debug, Default, Serialize, Deserialize, Type, ToSchema)]
pub struct QueryOrder<O>
where
	O: IntoOrderBy,
{
	pub order_by: O,
	pub direction: Direction,
}

pub trait OrderApplier<'a> {
	type FindManyQuery;
	type FindFirstQuery;

	/// Apply the ordering to a query that returns many results
	fn apply_many(self, query: Self::FindManyQuery) -> Self::FindManyQuery;
	/// Apply the ordering to a query that returns a single, non-unique result
	fn apply(self, query: Self::FindFirstQuery) -> Self::FindFirstQuery;
}

enum OrderByWithRelationOrAggregate<R, A> {
	FieldOrRelation(R),
	Aggregate(A),
}

impl<R, A> OrderByWithRelationOrAggregate<R, A> {
	fn into_inner(self) -> (Option<R>, Option<A>) {
		match self {
			OrderByWithRelationOrAggregate::FieldOrRelation(r) => (Some(r), None),
			OrderByWithRelationOrAggregate::Aggregate(a) => (None, Some(a)),
		}
	}
}
