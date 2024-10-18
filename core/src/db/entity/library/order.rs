use order_by_gen::OrderByGen;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::db::query::IntoOrderBy;

// #[derive(Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
// #[serde(rename_all = "snake_case")]
// #[prisma(module = "library")]
// enum LibraryAggregateOrderBy {
// 	Media,
// 	Series,
// }

#[derive(Default, Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
#[serde(rename_all = "snake_case")]
#[prisma(module = "library")]
pub enum LibraryOrderBy {
	#[default]
	Name,
	Path,
	Status,
	UpdatedAt,
	CreatedAt,
	// _Count(LibraryAggregateOrderBy),
}
