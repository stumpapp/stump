use async_graphql::{Enum, InputObject, Json, OneofObject, SimpleObject, Union};
use sea_orm::{prelude::*, DeriveActiveEnum, EnumIter, FromJsonQueryResult};
use serde::{de::Error, Deserialize, Deserializer, Serialize};
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
#[graphql(input_name = "RecentlyAddedInput")]
pub struct RecentlyAdded {
	entity: FilterableArrangementEntity,
	name: Option<String>,
	// filter: Option<Json<serde_json::Value>>,
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
#[graphql(input_name = "OnDeckBooksInput")]
pub struct OnDeckBooks {
	name: Option<String>,
	#[graphql(default)]
	links: Vec<FilterableArrangementEntityLink>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Union, OneofObject)]
#[graphql(input_name = "ArrangementConfigInput")]
#[serde(tag = "type")]
pub enum ArrangementConfig {
	System(SystemArrangementConfig),
	InProgressBooks(InProgressBooks),
	OnDeckBooks(OnDeckBooks),
	RecentlyAdded(RecentlyAdded),
	Custom(CustomArrangementConfig),
}

// Legacy configs had no discriminator. InProgressBooks accepts the same fields as
// RecentlyAdded and Custom, so an untagged derive loses their identity on read.
// Write explicit tags, while continuing to read the existing stored JSON.
impl<'de> Deserialize<'de> for ArrangementConfig {
	fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
		let value = serde_json::Value::deserialize(deserializer)?;
		#[derive(Deserialize)]
		#[serde(tag = "type")]
		enum TaggedConfig {
			System(SystemArrangementConfig),
			InProgressBooks(InProgressBooks),
			OnDeckBooks(OnDeckBooks),
			RecentlyAdded(RecentlyAdded),
			Custom(CustomArrangementConfig),
		}
		if value.get("type").is_some() {
			return serde_json::from_value::<TaggedConfig>(value)
				.map(|config| match config {
					TaggedConfig::System(config) => Self::System(config),
					TaggedConfig::InProgressBooks(config) => {
						Self::InProgressBooks(config)
					},
					TaggedConfig::OnDeckBooks(config) => Self::OnDeckBooks(config),
					TaggedConfig::RecentlyAdded(config) => Self::RecentlyAdded(config),
					TaggedConfig::Custom(config) => Self::Custom(config),
				})
				.map_err(D::Error::custom);
		}
		if value.get("variant").is_some() {
			serde_json::from_value(value).map(Self::System)
		} else if value.get("filter").is_some() || value.get("order_by").is_some() {
			serde_json::from_value(value).map(Self::Custom)
		} else if value.get("entity").is_some() {
			serde_json::from_value(value).map(Self::RecentlyAdded)
		} else {
			serde_json::from_value(value).map(Self::InProgressBooks)
		}
		.map_err(D::Error::custom)
	}
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

/// The home mutation contract deliberately contains only sections. The existing
/// Arrangement query and storage shape are retained for backwards compatibility.
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
	pub fn new(sections: Vec<ArrangementSection>) -> Result<Self, &'static str> {
		if sections.len() != 4 {
			return Err("Include each of the four home sections exactly once; use visible to hide a section");
		}
		let mut keys = std::collections::HashSet::new();
		for section in &sections {
			let key = section.home_key().ok_or("Unsupported home section")?;
			if !keys.insert(key) {
				return Err("Duplicate home section");
			}
		}
		Ok(Self { sections })
	}
}

impl From<HomeArrangement> for Arrangement {
	fn from(home: HomeArrangement) -> Self {
		Self {
			// Legacy storage/query field only; it is not part of the home
			// mutation contract and does not gate editing.
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
	/// Old home preferences predate OnDeck. Add missing built-in sections without
	/// resetting a saved order or visibility, and without writing during a read.
	pub fn with_missing_home_sections(mut self) -> Self {
		for section in Self::default_home().sections {
			let key = section.home_key();
			if !self.sections.iter().any(|item| item.home_key() == key) {
				if key == Some("onDeck") {
					let index = self
						.sections
						.iter()
						.position(|item| item.home_key() == Some("continueReading"))
						.map_or(self.sections.len(), |index| index + 1);
					self.sections.insert(index, section);
				} else {
					self.sections.push(section);
				}
			}
		}
		self
	}

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
	fn legacy_home_order_and_visibility_survive_upgrade() {
		let legacy = serde_json::json!({
			"locked": true,
			"sections": [
				{"config": {"entity": "SERIES", "name": null, "links": []}, "visible": false},
				{"config": {"name": null, "links": []}, "visible": true},
				{"config": {"entity": "BOOKS", "name": null, "links": []}, "visible": true}
			]
		});
		let arrangement: Arrangement = serde_json::from_value(legacy).unwrap();
		let arrangement = arrangement.with_missing_home_sections();
		let keys: Vec<_> = arrangement
			.sections
			.iter()
			.map(ArrangementSection::home_key)
			.collect();
		assert_eq!(
			keys,
			vec![
				Some("recentlyAddedSeries"),
				Some("continueReading"),
				Some("onDeck"),
				Some("recentlyAddedBooks")
			]
		);
		assert!(!arrangement.sections[0].visible);
		assert_eq!(
			arrangement.clone().with_missing_home_sections(),
			arrangement
		);
		assert_eq!(
			serde_json::from_value::<Arrangement>(
				serde_json::to_value(&arrangement).unwrap()
			)
			.unwrap(),
			arrangement
		);
	}

	#[test]
	fn navigation_and_custom_legacy_configs_keep_their_identity() {
		let navigation = Arrangement::default_navigation();
		let mut legacy = serde_json::to_value(&navigation).unwrap();
		for section in legacy["sections"].as_array_mut().unwrap() {
			section["config"].as_object_mut().unwrap().remove("type");
		}
		assert_eq!(
			serde_json::from_value::<Arrangement>(legacy).unwrap(),
			navigation
		);
		let custom = serde_json::json!({"entity": "BOOKS", "name": "My books", "filter": {"test": true}, "order_by": null, "links": []});
		let config: ArrangementConfig = serde_json::from_value(custom).unwrap();
		assert!(matches!(config, ArrangementConfig::Custom(_)));
		assert_eq!(
			serde_json::from_value::<ArrangementConfig>(
				serde_json::to_value(&config).unwrap()
			)
			.unwrap(),
			config
		);
	}

	#[test]
	fn invalid_config_tags_are_not_reinterpreted_as_legacy() {
		assert!(serde_json::from_value::<ArrangementConfig>(
			serde_json::json!({"type": "Unknown", "links": []})
		)
		.is_err());
	}

	#[test]
	fn home_input_requires_each_supported_section_once() {
		let sections = Arrangement::default_home().sections;
		assert_eq!(sections.len(), 4);
		assert!(HomeArrangement::new(sections[..3].to_vec()).is_err());
		let mut duplicate = sections.clone();
		duplicate[1] = duplicate[0].clone();
		assert!(HomeArrangement::new(duplicate).is_err());
		let mut unsupported = sections.clone();
		unsupported[0] = Arrangement::default_navigation().sections[0].clone();
		assert!(HomeArrangement::new(unsupported).is_err());
		let mut unsupported_entity = sections.clone();
		unsupported_entity[2].config = ArrangementConfig::RecentlyAdded(RecentlyAdded {
			entity: FilterableArrangementEntity::Libraries,
			..Default::default()
		});
		assert!(HomeArrangement::new(unsupported_entity).is_err());
		let hidden = sections
			.into_iter()
			.rev()
			.map(|mut section| {
				section.visible = false;
				section
			})
			.collect();
		let home = HomeArrangement::new(hidden).unwrap();
		assert!(home.sections.iter().all(|section| !section.visible));
	}
}
