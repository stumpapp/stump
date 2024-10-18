use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::prisma::SortOrder;

/// A trait to convert an enum variant into a prisma order parameter
pub trait IntoOrderBy {
	type OrderParam;
	/// Convert the enum variant into a prisma order parameter, e.g. `media::name::order(SortOrder::Asc)`
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
	O: IntoOrderBy + Default,
{
	pub order_by: O,
	pub direction: Direction,
}

impl<O> QueryOrder<O>
where
	O: IntoOrderBy + Default,
{
	pub fn into_prisma(self) -> O::OrderParam {
		self.order_by.into_prisma_order(self.direction.into())
	}
}
