use async_graphql::SimpleObject;
use sea_orm::{prelude::Decimal, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, SimpleObject)]
pub struct ImageRef {
	pub url: String,
	pub height: Option<u32>,
	pub width: Option<u32>,
	pub metadata: Option<ImageMetadata>,
}

#[derive(
	Debug, Clone, SimpleObject, Deserialize, Serialize, PartialEq, Eq, FromJsonQueryResult,
)]
pub struct ImageColor {
	pub color: String,
	pub percentage: Decimal,
}

#[derive(
	Default,
	Debug,
	Clone,
	SimpleObject,
	Deserialize,
	Serialize,
	PartialEq,
	Eq,
	FromJsonQueryResult,
)]
pub struct ImageMetadata {
	pub average_color: Option<String>,
	pub colors: Vec<ImageColor>,
	pub thumbhash: Option<String>,
}
