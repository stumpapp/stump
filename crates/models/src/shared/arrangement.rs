use async_graphql::{Enum, InputObject, Json, OneofObject, SimpleObject, Union};
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
pub enum SystemArrangement {
	Home,
	Explore,
	Libraries,
	SmartLists,
	BookClubs,
}

#[derive(
	Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject, InputObject,
)]
#[graphql(input_name = "SystemArrangementConfigInput")]
pub struct SystemArrangementConfig {
	variant: SystemArrangement,
	#[graphql(default)]
	links: Vec<FilterableArrangementEntityLink>,
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

// TODO: Rename since I am now using this for both home and navigation arrangements.
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

#[derive(
	Debug,
	Clone,
	Default,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	SimpleObject,
	InputObject,
)]
#[graphql(input_name = "FilterableArrangementEntityLinkInput")]
pub struct CustomArrangementConfig {
	entity: FilterableArrangementEntity,
	name: Option<String>,
	// TODO(custom-arrangement): Support typed filters
	filter: Option<Json<serde_json::Value>>,
	order_by: Option<String>,
	#[graphql(default)]
	links: Vec<FilterableArrangementEntityLink>,
}

#[derive(
	Debug,
	Clone,
	Default,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	SimpleObject,
	InputObject,
)]
#[graphql(input_name = "InProgressBooksInput")]
pub struct InProgressBooks {
	name: Option<String>,
	// filter: Option<Json<serde_json::Value>>,
}

#[derive(
	Debug,
	Clone,
	Default,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	SimpleObject,
	InputObject,
)]
#[graphql(input_name = "RecentlyAddedInput")]
pub struct RecentlyAdded {
	entity: FilterableArrangementEntity,
	name: Option<String>,
	// filter: Option<Json<serde_json::Value>>,
}

#[derive(
	Debug,
	Clone,
	Default,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	SimpleObject,
	InputObject,
)]
#[graphql(input_name = "OnDeckBooksInput")]
pub struct OnDeckBooks {
	name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Union, OneofObject)]
#[graphql(input_name = "ArrangementConfigInput")]
#[serde(tag = "type")]
pub enum ArrangementConfig {
	System(SystemArrangementConfig),
	InProgressBooks(InProgressBooks),
	OnDeckBooks(OnDeckBooks),
	RecentlyAdded(RecentlyAdded),
	Custom(CustomArrangementConfig),
}

#[derive(
	Debug, Clone, PartialEq, Eq, Serialize, Deserialize, SimpleObject, InputObject,
)]
#[graphql(input_name = "ArrangementSectionInput")]
pub struct ArrangementSection {
	config: ArrangementConfig,
	#[serde(default = "default_true")]
	#[graphql(default_with = "default_true()")]
	visible: bool,
}

/// The sections displayed on a user's home page.
#[derive(Debug, Clone, SimpleObject)]
pub struct HomeArrangement {
	pub sections: Vec<ArrangementSection>,
}

impl ArrangementSection {
	fn home_key(&self) -> Option<&'static str> {
		match &self.config {
			ArrangementConfig::InProgressBooks(_) => Some("continueReading"),
			ArrangementConfig::OnDeckBooks(_) => Some("onDeck"),
			ArrangementConfig::RecentlyAdded(config) => match config.entity {
				FilterableArrangementEntity::Books => Some("recentlyAddedBooks"),
				FilterableArrangementEntity::Series => Some("recentlyAddedSeries"),
				_ => None,
			},
			_ => None,
		}
	}
}

impl HomeArrangement {
	pub fn new(sections: Vec<ArrangementSection>) -> Self {
		let mut seen = std::collections::HashSet::new();
		let mut sections: Vec<_> = sections
			.into_iter()
			.filter(|section| section.home_key().is_some_and(|key| seen.insert(key)))
			.collect();

		for mut section in Arrangement::default_home().sections {
			if seen.insert(section.home_key().unwrap()) {
				section.visible = false;
				sections.push(section);
			}
		}
		Self { sections }
	}
}

impl From<HomeArrangement> for Arrangement {
	fn from(home: HomeArrangement) -> Self {
		Self {
			// TODO(arrangement): delete this field and usages
			locked: false,
			sections: home.sections,
		}
	}
}

#[derive(
	Debug, Clone, SimpleObject, PartialEq, Eq, Serialize, Deserialize, FromJsonQueryResult,
)]
pub struct Arrangement {
	pub locked: bool,
	pub sections: Vec<ArrangementSection>,
}

impl Arrangement {
	pub fn default_home() -> Arrangement {
		Arrangement {
			locked: false,
			sections: vec![
				ArrangementSection {
					config: ArrangementConfig::InProgressBooks(InProgressBooks::default()),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::OnDeckBooks(OnDeckBooks::default()),
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
					config: ArrangementConfig::System(SystemArrangementConfig {
						variant: SystemArrangement::Home,
						links: vec![],
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::System(SystemArrangementConfig {
						variant: SystemArrangement::Explore,
						links: vec![],
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::System(SystemArrangementConfig {
						variant: SystemArrangement::Libraries,
						links: vec![FilterableArrangementEntityLink::Create],
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::System(SystemArrangementConfig {
						variant: SystemArrangement::SmartLists,
						links: vec![FilterableArrangementEntityLink::Create],
					}),
					visible: true,
				},
				ArrangementSection {
					config: ArrangementConfig::System(SystemArrangementConfig {
						variant: SystemArrangement::BookClubs,
						links: vec![FilterableArrangementEntityLink::Create],
					}),
					visible: true,
				},
			],
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn home_arrangement_round_trip_preserves_sections() {
		let arrangement = Arrangement::default_home();
		let json = serde_json::to_value(&arrangement).unwrap();
		let restored: Arrangement = serde_json::from_value(json).unwrap();
		assert_eq!(restored, arrangement);
	}

	#[test]
	fn unknown_config_tag_errors() {
		assert!(serde_json::from_value::<ArrangementConfig>(
			serde_json::json!({"type": "Unknown"})
		)
		.is_err());
	}

	#[test]
	fn home_sections_are_normalized_without_changing_valid_order_or_visibility() {
		let defaults = Arrangement::default_home().sections;
		let mut hidden_books = defaults[2].clone();
		hidden_books.visible = false;
		let unsupported_entity = ArrangementSection {
			config: ArrangementConfig::RecentlyAdded(RecentlyAdded {
				entity: FilterableArrangementEntity::Libraries,
				..Default::default()
			}),
			visible: true,
		};
		let home = HomeArrangement::new(vec![
			defaults[3].clone(),
			hidden_books.clone(),
			defaults[2].clone(),
			Arrangement::default_navigation().sections[0].clone(),
			unsupported_entity,
		]);
		assert_eq!(home.sections.len(), 4);
		assert_eq!(home.sections[0], defaults[3]);
		assert_eq!(home.sections[1], hidden_books);
		assert_eq!(home.sections[2].home_key(), Some("continueReading"));
		assert_eq!(home.sections[3].home_key(), Some("onDeck"));
		assert!(!home.sections[2].visible);
		assert!(!home.sections[3].visible);
		assert_eq!(
			HomeArrangement::new(home.sections.clone()).sections,
			home.sections
		);
	}

	#[test]
	fn empty_home_sections_are_filled_as_hidden() {
		let home = HomeArrangement::new(vec![]);
		assert_eq!(home.sections.len(), 4);
		assert!(home.sections.iter().all(|section| !section.visible));
	}
}
