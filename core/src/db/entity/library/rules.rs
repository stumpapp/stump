use globset::{Glob, GlobSet, GlobSetBuilder};
use serde::{Deserialize, Serialize};
use specta::Type;
use utoipa::ToSchema;

use crate::{CoreError, CoreResult};

// Note: These are glob patterns, but that is not a serializable type in Rust.
// So we're just going to use strings which are validated upon creation.
// The vector is not public to enforce validation on creation.
#[derive(Default, Debug, Clone, Serialize, Deserialize, Type, ToSchema)]
pub struct IgnoreRules(Vec<String>);

impl IgnoreRules {
	/// Create a new set of scan rules. This will validate each rule to ensure
	/// that it is a valid glob pattern.
	pub fn new(rules: Vec<String>) -> CoreResult<Self> {
		let invalid_rules = rules
			.iter()
			.filter(|rule| Glob::new(rule).is_err())
			.collect::<Vec<_>>();

		if !invalid_rules.is_empty() {
			return Err(CoreError::BadRequest(
				"Invalid scan rules provided".to_string(),
			));
		}

		Ok(Self(rules))
	}

	/// Get the number of ignore rules in the set
	pub fn len(&self) -> usize {
		self.0.len()
	}

	/// Check if the ignore rules set is empty
	pub fn is_empty(&self) -> bool {
		self.0.is_empty()
	}

	/// Get the underlying rules as a vector of glob patterns. If any of the
	/// rules are invalid, this will return an error.
	pub fn rules(&self) -> CoreResult<Vec<Glob>> {
		self.0
			.iter()
			.map(|rule| Glob::new(rule).map_err(CoreError::from))
			.collect()
	}

	/// Serialize the ignore rules to a byte vector, which gets dumped into the
	/// database.
	pub fn as_bytes(&self) -> CoreResult<Vec<u8>> {
		serde_json::to_vec(self).map_err(|error| {
			tracing::error!(?error, "Failed to serialize scan rules");
			error.into()
		})
	}

	/// Convert the ignore rules into a glob set
	pub fn build(&self) -> CoreResult<GlobSet> {
		GlobSet::try_from(self.clone())
	}
}

impl TryFrom<Vec<u8>> for IgnoreRules {
	type Error = CoreError;

	fn try_from(value: Vec<u8>) -> Result<Self, Self::Error> {
		serde_json::from_slice(&value).map_err(|error| {
			tracing::error!(?error, "Failed to deserialize scan rules");
			error.into()
		})
	}
}

impl TryFrom<IgnoreRules> for Vec<u8> {
	type Error = CoreError;

	fn try_from(value: IgnoreRules) -> Result<Self, Self::Error> {
		serde_json::to_vec(&value).map_err(|error| {
			tracing::error!(?error, "Failed to serialize scan rules");
			error.into()
		})
	}
}

impl TryFrom<IgnoreRules> for GlobSet {
	type Error = CoreError;

	fn try_from(set: IgnoreRules) -> Result<Self, Self::Error> {
		let mut builder = GlobSetBuilder::new();

		for rule in set.rules()? {
			builder.add(rule);
		}

		Ok(builder.build()?)
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_ignore_rules() {
		let rules = IgnoreRules::new(vec![
			"*.txt".to_string(),
			"*.jpg".to_string(),
			"*.png".to_string(),
		])
		.unwrap();

		assert_eq!(rules.0.len(), 3);
	}

	#[test]
	fn test_invalid_ignore_rules() {
		assert!(IgnoreRules::new(vec!["[".to_string()]).is_err());
	}

	#[test]
	fn test_ignore_rules_to_globs() {
		let rules = IgnoreRules::new(vec![
			"*.txt".to_string(),
			"*.jpg".to_string(),
			"*.png".to_string(),
		])
		.unwrap();

		let globs = rules.rules().unwrap();

		assert_eq!(globs.len(), 3);
	}

	#[test]
	fn test_ignore_rules_to_globset() {
		let rules = IgnoreRules::new(vec![
			"*.txt".to_string(),
			"*.jpg".to_string(),
			"*.png".to_string(),
		])
		.unwrap();

		let globset = GlobSet::try_from(rules).unwrap();

		assert_eq!(globset.len(), 3);
	}

	#[test]
	fn test_parsed_globset_on_paths() {
		// Ignore any files which:
		// - end with `sample.mp4` at any depth
		// - start with `__` at any depth
		// - start with `___` at root
		// - are in a directory named `ignore-me`
		// Note path segment distinction between * and ** for matches
		let rules = IgnoreRules::new(vec![
			"**/sample.mp4".to_string(),
			"**__*".to_string(),
			"___*".to_string(),
			"**/ignore-me/**".to_string(),
		])
		.expect("Failed to create ignore rules");

		let globset = GlobSet::try_from(rules).expect("Failed to create globset");

		// These should all match
		assert!(globset.is_match("sample.mp4"));
		assert!(globset.is_match("path/to/sample.mp4"));
		assert!(globset.is_match("path/to/another/sample.mp4"));
		assert!(globset.is_match("__file.txt"));
		assert!(globset.is_match("path/to/__file.txt"));
		assert!(globset.is_match("path/to/another/__file.txt"));
		assert!(globset.is_match("___file.txt"));
		assert!(globset.is_match("ignore-me/file.txt"));
		assert!(globset.is_match("path/to/ignore-me/file.txt"));
		assert!(globset.is_match("path/to/another/ignore-me/file.txt"));

		// These should not match
		assert!(!globset.is_match("file.txt"));
		assert!(!globset.is_match("path/to/file.txt"));
		assert!(!globset.is_match("path/to/another/file.txt"));
		assert!(globset.is_match("path/to/___file.txt"));
		assert!(!globset.is_match("path/to/another/___file.txt"));
	}

	#[test]
	fn test_ignore_rules_serialization() {
		let rules = IgnoreRules::new(vec![
			"*.txt".to_string(),
			"*.jpg".to_string(),
			"*.png".to_string(),
		])
		.unwrap();

		let bytes = rules.as_bytes().unwrap();
		let deserialized = IgnoreRules::try_from(bytes).unwrap();

		assert_eq!(rules.0[0], deserialized.0[0]);
		assert_eq!(rules.0[1], deserialized.0[1]);
		assert_eq!(rules.0[2], deserialized.0[2]);
	}

	#[test]
	fn test_ignore_rules_len() {
		let rules = IgnoreRules::new(vec![
			"*.txt".to_string(),
			"*.jpg".to_string(),
			"*.png".to_string(),
		])
		.unwrap();

		assert_eq!(rules.len(), 3);
	}

	#[test]
	fn test_ignore_rules_is_empty() {
		let rules = IgnoreRules::new(vec![]).unwrap();

		assert!(rules.is_empty());
	}

	#[test]
	fn test_ignore_rules_is_not_empty() {
		let rules = IgnoreRules::new(vec!["*.txt".to_string()]).unwrap();

		assert!(!rules.is_empty());
	}
}
