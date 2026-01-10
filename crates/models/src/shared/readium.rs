use async_graphql::{InputObject, SimpleObject};
use sea_orm::{prelude::Decimal, FromJsonQueryResult};
use serde::{Deserialize, Serialize};

#[derive(
	Clone,
	Debug,
	SimpleObject,
	InputObject,
	Deserialize,
	Serialize,
	FromJsonQueryResult,
	PartialEq,
	Eq,
)]
#[graphql(input_name = "ReadiumLocationInput")]
#[serde(rename_all = "camelCase")]
pub struct ReadiumLocation {
	pub fragments: Option<Vec<String>>,
	pub progression: Option<Decimal>,
	pub position: Option<i32>,
	pub total_progression: Option<Decimal>,
	pub css_selector: Option<String>,
	pub partial_cfi: Option<String>,
}

#[derive(
	Clone,
	Debug,
	SimpleObject,
	InputObject,
	Deserialize,
	Serialize,
	FromJsonQueryResult,
	PartialEq,
	Eq,
)]
#[graphql(input_name = "ReadiumTextInput")]
#[serde(rename_all = "camelCase")]
pub struct ReadiumText {
	pub after: Option<String>,
	pub before: Option<String>,
	pub highlight: Option<String>,
}

fn default_type() -> String {
	"application/xhtml+xml".to_string()
}

#[derive(
	Clone,
	Debug,
	SimpleObject,
	InputObject,
	Deserialize,
	Serialize,
	FromJsonQueryResult,
	PartialEq,
	Eq,
)]
#[graphql(input_name = "ReadiumLocatorInput")]
#[serde(rename_all = "camelCase")]
pub struct ReadiumLocator {
	#[graphql(default = "")]
	#[serde(default)]
	pub chapter_title: String,
	pub href: String,
	pub title: Option<String>,
	pub locations: Option<ReadiumLocation>,
	pub text: Option<ReadiumText>,
	#[graphql(default = "application/xhtml+xml", name = "type")]
	#[serde(default = "default_type")]
	pub r#type: String,
}
