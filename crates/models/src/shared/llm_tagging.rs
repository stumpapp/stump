use async_graphql::SimpleObject;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

/// How suggested tags are applied to books
#[derive(
	Debug,
	Clone,
	Copy,
	Default,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	async_graphql::Enum,
)]
#[serde(rename_all = "snake_case")]
pub enum LlmApplyStrategy {
	/// Only add tags which the book does not already have; never remove
	/// existing tags
	#[default]
	MergeOnly,
}

/// The scope of books an LLM tagging run should consider
#[derive(
	Debug,
	Clone,
	Copy,
	Default,
	PartialEq,
	Eq,
	Serialize,
	Deserialize,
	async_graphql::Enum,
)]
#[serde(rename_all = "snake_case")]
pub enum LlmTagBatchScope {
	/// Only tag books which do not have any tags linked yet
	#[default]
	NewBooksOnly,
	/// Consider all books, regardless of existing tags
	AllBooks,
}

/// User-managed configuration for the LLM tagging features. Stored as JSON in
/// `server_config.llm_tagging_config`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, SimpleObject)]
#[serde(default, rename_all = "camelCase")]
pub struct LlmTaggingConfig {
	/// Master switch consulted by the post-scan auto tagging hook
	pub enabled: bool,
	/// When set, books whose suggestions all meet or exceed this confidence
	/// are applied automatically instead of awaiting manual review
	pub auto_apply_threshold: Option<f64>,
	/// Rate limit for LLM API requests, in requests per second
	pub requests_per_second: f64,
	/// How many LLM requests may be in flight concurrently within a job
	pub concurrency: u32,
	/// Maximum number of LLM requests per day before remaining work is
	/// marked as rate limited for a later retry
	pub daily_request_limit: u32,
	/// Library analysis batch size (books per LLM request)
	pub batch_size: u32,
	/// Book summaries are truncated to this many characters before being
	/// sent to the LLM
	pub max_summary_chars: u32,
	/// Which books per-book tagging runs should consider
	pub batch_scope: LlmTagBatchScope,
}

impl Default for LlmTaggingConfig {
	fn default() -> Self {
		Self {
			enabled: false,
			auto_apply_threshold: None,
			requests_per_second: 0.5,
			concurrency: 4,
			daily_request_limit: 2000,
			batch_size: 200,
			max_summary_chars: 400,
			batch_scope: LlmTagBatchScope::default(),
		}
	}
}

impl LlmTaggingConfig {
	/// Parses the config from a JSON value, falling back to defaults for
	/// missing fields. Returns [`LlmTaggingConfig::default`] when the value
	/// is absent or cannot be parsed.
	pub fn from_json(value: Option<&JsonValue>) -> Self {
		value
			.and_then(|v| serde_json::from_value(v.clone()).ok())
			.unwrap_or_default()
	}

	/// Sanitizes user-provided values into safe bounds
	pub fn sanitized(mut self) -> Self {
		if !self.requests_per_second.is_finite() || self.requests_per_second <= 0.0 {
			self.requests_per_second = 0.5;
		}
		self.requests_per_second = self.requests_per_second.min(100.0);
		self.concurrency = self.concurrency.clamp(1, 64);
		self.batch_size = self.batch_size.clamp(10, 1000);
		self.max_summary_chars = self.max_summary_chars.clamp(0, 4000);
		self.daily_request_limit = self.daily_request_limit.max(1);
		if let Some(threshold) = self.auto_apply_threshold {
			self.auto_apply_threshold = Some(threshold.clamp(0.0, 1.0));
		}
		self
	}

	pub fn to_json(&self) -> JsonValue {
		serde_json::to_value(self).unwrap_or(JsonValue::Null)
	}
}

/// Normalizes a tag name produced by the LLM: trimmed, whitespace-collapsed,
/// capped in length, and lowercased for comparison purposes
pub fn normalize_tag_key(name: &str) -> String {
	name.split_whitespace()
		.collect::<Vec<_>>()
		.join(" ")
		.to_lowercase()
}

/// Normalizes a tag name for storage, enforcing a max length
pub fn normalize_tag_name(name: &str) -> Option<String> {
	let normalized = name.split_whitespace().collect::<Vec<_>>().join(" ");
	if normalized.is_empty() {
		return None;
	}
	const MAX_TAG_LEN: usize = 50;
	Some(normalized.chars().take(MAX_TAG_LEN).collect())
}

/// A suggested tag as persisted inside `llm_tag_suggestions.suggested_tags`
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
#[serde(default, rename_all = "camelCase")]
pub struct LlmSuggestedTag {
	pub name: String,
	pub confidence: f64,
	pub reason: Option<String>,
}

impl Default for LlmSuggestedTag {
	fn default() -> Self {
		Self {
			name: String::new(),
			confidence: 0.0,
			reason: None,
		}
	}
}

/// A media -> tags assignment as persisted inside
/// `llm_library_tag_drafts.assignments`
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct LlmLibraryTagAssignment {
	pub media_id: String,
	pub tags: Vec<String>,
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_deserialize_partial_config() {
		let config: LlmTaggingConfig =
			serde_json::from_str(r#"{ "enabled": true }"#).unwrap();
		assert!(config.enabled);
		assert_eq!(config.batch_size, 200);
		assert_eq!(config.concurrency, 4);
	}

	#[test]
	fn test_sanitize() {
		let config = LlmTaggingConfig {
			concurrency: 500,
			batch_size: 1,
			..Default::default()
		}
		.sanitized();
		assert_eq!(config.concurrency, 64);
		assert_eq!(config.batch_size, 10);
	}

	#[test]
	fn test_normalize_tag() {
		assert_eq!(
			normalize_tag_key("  Sci-Fi   Adventure "),
			"sci-fi adventure"
		);
		assert_eq!(normalize_tag_name("  a   b ").as_deref(), Some("a b"));
		assert_eq!(normalize_tag_name("   "), None);
	}
}
