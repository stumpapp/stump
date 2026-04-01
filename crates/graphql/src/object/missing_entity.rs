use async_graphql::{Enum, SimpleObject};
use sea_orm::{prelude::*, DeriveActiveEnum, EnumIter, FromQueryResult};
use serde::{Deserialize, Serialize};
use strum::EnumString;

#[derive(
	Debug,
	Clone,
	Copy,
	Enum,
	EnumString,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	DeriveActiveEnum,
	EnumIter,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum MissingEntityType {
	Book,
	Series,
	Library,
}

#[derive(Debug, Clone, SimpleObject, FromQueryResult)]
pub struct MissingEntity {
	pub id: String,
	pub path: String,
	pub r#type: MissingEntityType,
}
