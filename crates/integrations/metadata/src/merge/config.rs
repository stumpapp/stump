use async_graphql::{Enum, InputObject};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::types::MetadataField;

/// How to merge external metadata values onto existing entity metadata
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MergeStrategy {
	/// Only populate fields that are currently nullish
	#[default]
	FillGaps,
	/// Overwrite existing values with (truthy) external data
	PreferExternal,
	/// PreferExternal for scalars, merge/dedupe for array fields
	PreferExternalAndMergeLists,
	/// FillGaps and merge/dedupe for array fields
	FillAndMergeLists,
}

/// The config for automatic metadata application
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AutoApplyConfig {
	/// Whether auto-apply is enabled
	pub enabled: bool,
	/// Minimum confidence score (0.0–1.0) for a match to be auto-applied
	#[serde(with = "rust_decimal::serde::float")]
	pub threshold: Decimal,
	/// The merge strategy to use when applying external metadata
	pub strategy: MergeStrategy,
	/// Fields to skip during auto-apply (regardless of strategy)
	#[serde(default)]
	pub exclude_fields: Vec<MetadataField>,
}

impl Default for AutoApplyConfig {
	fn default() -> Self {
		Self {
			enabled: false,
			threshold: Decimal::new(95, 2),
			strategy: MergeStrategy::FillGaps,
			exclude_fields: Vec::new(),
		}
	}
}

/// A user-provided override value for a specific metadata field
#[derive(Debug, Clone, Serialize, Deserialize, InputObject)]
pub struct MetadataFieldOverride {
	/// Which metadata field this override applies to
	pub field: MetadataField,
	/// The value to set, using Json because I am lazy
	pub value: JsonValue,
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn auto_apply_config_serialization() {
		let config = AutoApplyConfig {
			enabled: true,
			threshold: Decimal::new(80, 2),
			strategy: MergeStrategy::FillAndMergeLists,
			exclude_fields: vec![MetadataField::Cover, MetadataField::Tags],
		};

		let json = serde_json::to_string(&config).unwrap();

		assert_eq!(
			json,
			r#"{"enabled":true,"threshold":0.8,"strategy":"FILL_AND_MERGE_LISTS","exclude_fields":["COVER","TAGS"]}"#
		);
	}

	#[test]
	fn auto_apply_config_deserialization() {
		let json = r#"{"enabled":true,"threshold":0.8,"strategy":"FILL_AND_MERGE_LISTS","exclude_fields":["COVER","TAGS"]}"#;
		let config: AutoApplyConfig = serde_json::from_str(json).unwrap();

		assert!(config.enabled);
		assert!((config.threshold - Decimal::new(80, 2)).abs() < Decimal::new(1, 2));
		assert_eq!(config.strategy, MergeStrategy::FillAndMergeLists);
		assert_eq!(config.exclude_fields.len(), 2);
		assert!(config.exclude_fields.contains(&MetadataField::Cover));
		assert!(config.exclude_fields.contains(&MetadataField::Tags));
	}
}
