use order_by_gen::OrderByGen;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::db::query::IntoOrderBy;

// #[derive(Debug, Deserialize, Serialize, Type, ToSchema)]
// #[serde(rename_all = "snake_case")]
// enum SeriesAggregateOrderBy {
// 	Media,
// }

#[derive(Default, Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
#[serde(rename_all = "snake_case")]
#[prisma(module = "series")]
pub enum SeriesOrderBy {
	#[default]
	Name,
	Description,
	UpdatedAt,
	CreatedAt,
	Path,
	Status,
	// _Count(SeriesAggregateOrderBy),
}
