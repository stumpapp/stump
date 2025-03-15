use std::{fmt, str::FromStr};

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "library_configs")]
pub struct Model {
	#[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
	pub id: String,
	pub convert_rar_to_zip: bool,
	pub hard_delete_conversions: bool,
	#[sea_orm(column_type = "Text")]
	pub default_reading_dir: String,
	#[sea_orm(column_type = "Text")]
	pub default_reading_mode: String,
	#[sea_orm(column_type = "Text")]
	pub default_reading_image_scale_fit: String,
	pub generate_file_hashes: bool,
	pub generate_koreader_hashes: bool,
	pub process_metadata: bool,
	pub watch: bool,
	#[sea_orm(column_type = "Text")]
	pub library_pattern: String,
	#[sea_orm(column_type = "Blob", nullable)]
	pub thumbnail_config: Option<Vec<u8>>,
	#[sea_orm(column_type = "Blob", nullable)]
	pub ignore_rules: Option<Vec<u8>>,
	#[sea_orm(column_type = "Text", nullable)]
	pub library_id: Option<String>,
}

impl Model {
	pub fn is_collection_based(&self) -> bool {
		self.library_pattern == LibraryPattern::CollectionBased.to_string()
	}

	// pub fn ignore_rules(&self) -> IgnoreRules {
	// 	self.ignore_rules
	// 		.map_or_else(IgnoreRules::default, |rules| {
	// 			IgnoreRules::try_from(rules).unwrap_or_default()
	// 		})
	// }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
	#[sea_orm(has_one = "super::library::Entity")]
	Library,
}

impl Related<super::library::Entity> for Entity {
	fn to() -> RelationDef {
		Relation::Library.def()
	}
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub enum LibraryPattern {
	#[serde(rename = "SERIES_BASED")]
	SeriesBased,
	#[serde(rename = "COLLECTION_BASED")]
	CollectionBased,
}

impl FromStr for LibraryPattern {
	type Err = String;

	fn from_str(s: &str) -> Result<Self, Self::Err> {
		let uppercase = s.to_uppercase();

		match uppercase.as_str() {
			"SERIES_BASED" => Ok(LibraryPattern::SeriesBased),
			"COLLECTION_BASED" => Ok(LibraryPattern::CollectionBased),
			"" => Ok(LibraryPattern::default()),
			_ => Err(format!("Invalid library pattern: {s}")),
		}
	}
}

impl Default for LibraryPattern {
	fn default() -> Self {
		Self::SeriesBased
	}
}

impl From<String> for LibraryPattern {
	fn from(s: String) -> Self {
		LibraryPattern::from_str(&s).unwrap_or_default()
	}
}

impl fmt::Display for LibraryPattern {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		match self {
			LibraryPattern::SeriesBased => write!(f, "SERIES_BASED"),
			LibraryPattern::CollectionBased => write!(f, "COLLECTION_BASED"),
		}
	}
}
