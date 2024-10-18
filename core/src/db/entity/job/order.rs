use order_by_gen::OrderByGen;
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::db::query::IntoOrderBy;

#[derive(Default, Debug, Deserialize, Serialize, Type, ToSchema, OrderByGen)]
#[serde(rename_all = "snake_case")]
#[prisma(module = "job")]
pub enum JobOrderBy {
	#[default]
	Name,
	Status,
	CreatedAt,
	CompletedAt,
}
