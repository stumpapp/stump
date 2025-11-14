use async_graphql::SimpleObject;
use sea_orm::FromJsonQueryResult;
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, SimpleObject)]
pub struct ImageRef {
	pub url: String,
	pub height: Option<u32>,
	pub width: Option<u32>,
	pub metadata: Option<ImageMetadata>,
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
	pub mesh_colors: Vec<String>,
	pub thumbhash: Option<String>,
}
