use std::collections::{HashMap, HashSet};

use serde::de::DeserializeOwned;
use serde_json::Value as JsonValue;

use crate::{AutoApplyConfig, MergeStrategy, MetadataField, MetadataFieldOverride};

// Note: This is a little verbose, but I think its fine. I started to think through a macro route and quickly said fuck that lol

pub struct FieldMerger {
	strategy: MergeStrategy,
	locked_fields: HashSet<MetadataField>,
	exclude_fields: HashSet<MetadataField>,
	overrides: HashMap<MetadataField, JsonValue>,
}

impl FieldMerger {
	pub fn new(
		strategy: MergeStrategy,
		locked_fields: Vec<MetadataField>,
		exclude_fields: Vec<MetadataField>,
	) -> Self {
		Self {
			strategy,
			locked_fields: locked_fields.into_iter().collect(),
			exclude_fields: exclude_fields.into_iter().collect(),
			overrides: HashMap::new(),
		}
	}

	pub fn with_overrides(
		strategy: MergeStrategy,
		locked_fields: Vec<MetadataField>,
		exclude_fields: Vec<MetadataField>,
		overrides: Vec<MetadataFieldOverride>,
	) -> Self {
		Self {
			strategy,
			locked_fields: locked_fields.into_iter().collect(),
			exclude_fields: exclude_fields.into_iter().collect(),
			overrides: overrides.into_iter().map(|o| (o.field, o.value)).collect(),
		}
	}

	pub fn from_config(
		config: &AutoApplyConfig,
		locked_fields_json: Option<&serde_json::Value>,
	) -> Self {
		let locked: Vec<MetadataField> = locked_fields_json
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default();

		Self::new(config.strategy, locked, config.exclude_fields.clone())
	}

	fn can_write(&self, field: MetadataField) -> bool {
		!self.locked_fields.contains(&field) && !self.exclude_fields.contains(&field)
	}

	pub fn has_override(&self, field: MetadataField) -> bool {
		self.can_write(field) && self.overrides.contains_key(&field)
	}

	/// Apply a user-provided override for an optional scalar field:
	///
	/// - `Some(Some(value))` if the override should be applied with the given value
	/// - `Some(None)` if the override should clear the field
	/// - `None` if there is no override for this field
	pub fn apply_scalar_override<T: DeserializeOwned>(
		&self,
		field: MetadataField,
	) -> Option<Option<T>> {
		if !self.can_write(field) {
			return None;
		}
		match self.overrides.get(&field) {
			Some(v) if v.is_null() => Some(None),
			Some(v) => serde_json::from_value::<T>(v.clone()).ok().map(Some),
			None => None,
		}
	}

	/// Apply a user-provided override for a comma-separated list field.
	/// The override JSON value should be an array of strings.
	///
	/// - `Some(Some(joined))` if the override should be applied with the given value
	/// - `Some(None)` if the override should clear the field
	/// - `None` if there is no override for this field
	pub fn apply_comma_list_override(
		&self,
		field: MetadataField,
	) -> Option<Option<String>> {
		if !self.can_write(field) {
			return None;
		}
		match self.overrides.get(&field) {
			Some(v) if v.is_null() => Some(None),
			Some(v) => {
				let items: Vec<String> =
					serde_json::from_value(v.clone()).unwrap_or_default();
				if items.is_empty() {
					Some(None)
				} else {
					Some(Some(items.join(", ")))
				}
			},
			None => None,
		}
	}

	/// Merge a scalar Option<T> value:
	///
	/// - Returns `Some(new_value)` if the field should be updated
	/// - Returns `None` if it should be left unchanged.
	pub fn merge_scalar<T: Clone + PartialEq>(
		&self,
		field: MetadataField,
		existing: &Option<T>,
		external: &Option<T>,
	) -> Option<Option<T>> {
		if !self.can_write(field) {
			return None;
		}

		let external_val = match external {
			Some(v) => v,
			None => return None, // Nothing from external, leave as-is
		};

		match self.strategy {
			MergeStrategy::FillGaps | MergeStrategy::FillAndMergeLists => {
				if existing.is_none() {
					Some(Some(external_val.clone()))
				} else {
					None
				}
			},
			MergeStrategy::PreferExternal
			| MergeStrategy::PreferExternalAndMergeLists => Some(Some(external_val.clone())),
		}
	}

	/// Merge a required (non-Option) scalar:
	///
	/// - Returns `Some(new_value)` if the field should be updated
	/// - Returns `None` if it should be left unchanged.
	pub fn merge_required_scalar<T: Clone + PartialEq>(
		&self,
		field: MetadataField,
		_existing: &T,
		external: &Option<T>,
	) -> Option<T> {
		if !self.can_write(field) {
			return None;
		}

		let external_val = match external {
			Some(v) => v,
			None => return None,
		};

		match self.strategy {
			// For required fields that already have a value, FillGaps does nothing
			MergeStrategy::FillGaps | MergeStrategy::FillAndMergeLists => None,
			MergeStrategy::PreferExternal
			| MergeStrategy::PreferExternalAndMergeLists => Some(external_val.clone()),
		}
	}

	/// Merge a comma-separated list field:
	///
	/// - Returns `Some(new_value)` if the field should be updated
	/// - Returns `None` if it should be left unchanged
	pub fn merge_comma_list(
		&self,
		field: MetadataField,
		existing: &Option<String>,
		external: &Option<Vec<String>>,
	) -> Option<Option<String>> {
		if !self.can_write(field) {
			return None;
		}

		let external_items = match external {
			Some(items) if !items.is_empty() => items,
			_ => return None,
		};

		match self.strategy {
			MergeStrategy::FillGaps => {
				let is_empty = existing.as_ref().is_none_or(|s| s.trim().is_empty());
				if is_empty {
					Some(Some(external_items.join(", ")))
				} else {
					None
				}
			},
			MergeStrategy::PreferExternal => Some(Some(external_items.join(", "))),
			MergeStrategy::PreferExternalAndMergeLists
			| MergeStrategy::FillAndMergeLists => {
				let existing_items: HashSet<String> = existing
					.as_ref()
					.map(|s| {
						s.split(',')
							.map(|item| item.trim().to_string())
							.filter(|item| !item.is_empty())
							.collect()
					})
					.unwrap_or_default();

				let mut merged: Vec<String> = existing_items.iter().cloned().collect();

				for item in external_items {
					let normalized = item.trim().to_string();
					if !normalized.is_empty() && !existing_items.contains(&normalized) {
						merged.push(normalized);
					}
				}

				merged.sort();

				if merged.is_empty() {
					None
				} else {
					Some(Some(merged.join(", ")))
				}
			},
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn fill_gaps_only_fills_empty() {
		let merger = FieldMerger::new(MergeStrategy::FillGaps, vec![], vec![]);

		assert_eq!(
			merger.merge_scalar(MetadataField::Title, &None, &Some("New".to_string())),
			Some(Some("New".to_string()))
		); // existing is None -> should fill

		assert_eq!(
			merger.merge_scalar(
				MetadataField::Title,
				&Some("Old".to_string()),
				&Some("New".to_string())
			),
			None
		); // existing has value -> should skip

		assert_eq!(
			merger.merge_comma_list(
				MetadataField::Genres,
				&None,
				&Some(vec!["Sci-Fi".into(), "Fantasy".into()])
			),
			Some(Some("Sci-Fi, Fantasy".to_string()))
		); // existing is None -> should fill

		assert_eq!(
			merger.merge_comma_list(
				MetadataField::Genres,
				&Some("Horror".into()),
				&Some(vec!["Sci-Fi".into()])
			),
			None
		); // existing has value -> should skip
	}

	#[test]
	fn prefer_external_overwrites() {
		let merger = FieldMerger::new(MergeStrategy::PreferExternal, vec![], vec![]);

		assert_eq!(
			merger.merge_scalar(
				MetadataField::Summary,
				&Some("Old summary".to_string()),
				&Some("New summary".to_string())
			),
			Some(Some("New summary".to_string()))
		); // existing has value -> should overwrite

		assert_eq!(
			merger.merge_comma_list(
				MetadataField::Writers,
				&Some("Alice, Bob".into()),
				&Some(vec!["Charlie".into()])
			),
			Some(Some("Charlie".to_string()))
		); // existing has value -> should overwrite
	}

	#[test]
	fn fill_and_merge_lists_unions_arrays() {
		let merger = FieldMerger::new(MergeStrategy::FillAndMergeLists, vec![], vec![]);

		assert_eq!(
			merger.merge_scalar(
				MetadataField::Title,
				&Some("Old".to_string()),
				&Some("New".to_string())
			),
			None
		); // existing has value -> should skip

		let result = merger.merge_comma_list(
			MetadataField::Genres,
			&Some("Fantasy, Sci-Fi".into()),
			&Some(vec!["Horror".into(), "Sci-Fi".into(), "Romance".into()]),
		); // existing has value -> should merge/dedup

		assert_eq!(
			result,
			Some(Some("Fantasy, Horror, Romance, Sci-Fi".to_string()))
		);
	}

	#[test]
	fn prefer_external_and_merge_lists_overwrites_scalars_merges_lists() {
		let merger =
			FieldMerger::new(MergeStrategy::PreferExternalAndMergeLists, vec![], vec![]);

		assert_eq!(
			merger.merge_scalar(
				MetadataField::Title,
				&Some("Old".to_string()),
				&Some("New".to_string())
			),
			Some(Some("New".to_string()))
		);

		assert_eq!(
			merger.merge_required_scalar(
				MetadataField::Title,
				&"Old".to_string(),
				&Some("New".to_string())
			),
			Some("New".to_string())
		);

		let result = merger.merge_comma_list(
			MetadataField::Genres,
			&Some("Fantasy, Sci-Fi".into()),
			&Some(vec!["Horror".into(), "Sci-Fi".into(), "Romance".into()]),
		);
		assert_eq!(
			result,
			Some(Some("Fantasy, Horror, Romance, Sci-Fi".to_string()))
		);
	}

	#[test]
	fn locked_fields_never_written() {
		let merger = FieldMerger::new(
			MergeStrategy::PreferExternal,
			vec![MetadataField::Title],
			vec![],
		);

		assert_eq!(
			merger.merge_scalar(
				MetadataField::Title,
				&Some("Old".to_string()),
				&Some("New".to_string())
			),
			None
		); // locked field -> should skip always

		assert_eq!(
			merger.merge_scalar(
				MetadataField::Summary,
				&Some("Old".to_string()),
				&Some("New".to_string())
			),
			Some(Some("New".to_string()))
		); // non-locked field -> should overwrite as usual
	}

	#[test]
	fn excluded_fields_never_written() {
		let merger =
			FieldMerger::new(MergeStrategy::FillGaps, vec![], vec![MetadataField::Cover]);

		assert_eq!(
			merger.merge_scalar(MetadataField::Cover, &None, &Some("url".to_string())),
			None
		);
	}

	#[test]
	fn no_external_data_means_no_change() {
		let merger = FieldMerger::new(MergeStrategy::PreferExternal, vec![], vec![]);

		assert_eq!(
			merger.merge_scalar::<String>(
				MetadataField::Title,
				&Some("Old".into()),
				&None
			),
			None
		);
		assert_eq!(
			merger.merge_comma_list(MetadataField::Genres, &Some("Horror".into()), &None),
			None
		);
	}
}
