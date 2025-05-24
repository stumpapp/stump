use async_graphql::{Enum, Json, SimpleObject, Union};
use sea_orm::{prelude::*, DeriveActiveEnum, EnumIter, FromJsonQueryResult};
use serde::{Deserialize, Serialize};
use strum::{Display, EnumString};

fn default_true() -> bool {
	true
}

#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	EnumIter,
	PartialEq,
	DeriveActiveEnum,
	Enum,
	EnumString,
	Display,
	Serialize,
	Deserialize,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum SystemArrangment {
	Home,
	Explore,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject)]
pub struct SystemArrangmentConfig {
	variant: SystemArrangment,
}

#[derive(
	Eq,
	Copy,
	Default,
	Hash,
	Debug,
	Clone,
	EnumIter,
	PartialEq,
	DeriveActiveEnum,
	Enum,
	EnumString,
	Display,
	Serialize,
	Deserialize,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum FilterableArrangementEntity {
	#[default]
	Books,
	Libraries,
	Series,
	SmartLists,
	BookClubs,
}

#[derive(
	Eq,
	Copy,
	Hash,
	Debug,
	Clone,
	EnumIter,
	PartialEq,
	DeriveActiveEnum,
	Enum,
	EnumString,
	Display,
	Serialize,
	Deserialize,
)]
#[sea_orm(
	rs_type = "String",
	rename_all = "SCREAMING_SNAKE_CASE",
	db_type = "String(StringLen::None)"
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum FilterableArrangementEntityLink {
	Create,
	ShowAll,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, SimpleObject)]
pub struct CustomArrangementConfig {
	entity: FilterableArrangementEntity,
	name: Option<String>,
	// TODO(custom-arrangement): Support typed filters
	filter: Option<Json<serde_json::Value>>,
	order_by: Option<String>,
	#[graphql(default)]
	links: Vec<FilterableArrangementEntityLink>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, SimpleObject)]
pub struct InProgressBooks {
	name: Option<String>,
	// filter: Option<Json<serde_json::Value>>,
	#[graphql(default)]
	links: Vec<FilterableArrangementEntityLink>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, SimpleObject)]
pub struct RecentlyAdded {
	entity: FilterableArrangementEntity,
	name: Option<String>,
	// filter: Option<Json<serde_json::Value>>,
	#[graphql(default)]
	links: Vec<FilterableArrangementEntityLink>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Union)]
#[serde(untagged)]
pub enum ArrangementConfig {
	System(SystemArrangmentConfig),
	InProgressBooks(InProgressBooks),
	RecentlyAdded(RecentlyAdded),
	Custom(CustomArrangementConfig),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject)]
pub struct ArrangementSection {
	config: ArrangementConfig,
	#[serde(default = "default_true")]
	#[graphql(default_with = "default_true()")]
	visible: bool,
}

#[derive(
	Debug, Clone, SimpleObject, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult,
)]
pub struct Arrangement {
	locked: bool,
	sections: Vec<ArrangementSection>,
}

impl Arrangement {
	pub fn default_home() -> Arrangement {
		Arrangement {
			locked: true,
			sections: vec![
				ArrangementSection {
					config: ArrangementConfig::InProgressBooks(InProgressBooks::default()),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::RecentlyAdded(RecentlyAdded {
						entity: FilterableArrangementEntity::Books,
						..Default::default()
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::RecentlyAdded(RecentlyAdded {
						entity: FilterableArrangementEntity::Series,
						..Default::default()
					}),
					visible: true,
				},
			],
		}
	}

	pub fn default_navigation() -> Arrangement {
		Arrangement {
			locked: true,
			sections: vec![
				ArrangementSection {
					config: ArrangementConfig::System(SystemArrangmentConfig {
						variant: SystemArrangment::Home,
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::System(SystemArrangmentConfig {
						variant: SystemArrangment::Explore,
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::Custom(CustomArrangementConfig {
						name: Some("Libraries".to_string()),
						entity: FilterableArrangementEntity::Libraries,
						links: vec![FilterableArrangementEntityLink::Create],
						..Default::default()
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::Custom(CustomArrangementConfig {
						name: Some("Smart Lists".to_string()),
						entity: FilterableArrangementEntity::SmartLists,
						links: vec![FilterableArrangementEntityLink::Create],
						..Default::default()
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::Custom(CustomArrangementConfig {
						name: Some("Book Clubs".to_string()),
						entity: FilterableArrangementEntity::BookClubs,
						links: vec![FilterableArrangementEntityLink::Create],
						..Default::default()
					}),
					visible: true,
				},
			],
		}
	}
}
