use async_graphql::Enum;
use serde::{Deserialize, Serialize};

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
	pub threshold: f32,
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
			threshold: 0.95,
			strategy: MergeStrategy::FillGaps,
			exclude_fields: Vec::new(),
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn auto_apply_config_serialization() {
		let config = AutoApplyConfig {
			enabled: true,
			threshold: 0.80,
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
		assert!((config.threshold - 0.80).abs() < f32::EPSILON);
		assert_eq!(config.strategy, MergeStrategy::FillAndMergeLists);
		assert_eq!(config.exclude_fields.len(), 2);
		assert!(config.exclude_fields.contains(&MetadataField::Cover));
		assert!(config.exclude_fields.contains(&MetadataField::Tags));
	}
}
