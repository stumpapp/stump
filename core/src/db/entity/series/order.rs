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

#[derive(Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
#[serde(rename_all = "snake_case")]
#[prisma(module = "series")]
enum SeriesOrderBy {
	Name,
	Description,
	UpdatedAt,
	CreatedAt,
	Path,
	Status,
	// _Count(SeriesAggregateOrderBy),
}
