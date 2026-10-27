pub mod job;
pub mod library_job;

pub use job::{
	apply_tags, upsert_suggestion, LlmTagJob, LlmTagJobOutput, LlmTagJobParams,
};
pub use library_job::{LlmLibraryTagJob, LlmLibraryTagJobOutput, LlmLibraryTagJobParams};

use chrono::{NaiveTime, Utc};
use llm_integrations::{BookTaggingInput, LibraryBookBrief, LlmClient};
use models::{
	entity::{
		llm_library_tag_draft, llm_tag_suggestion, media, media_metadata, server_config,
		tag,
	},
	shared::{
		enums::LlmTagSuggestionStatus,
		llm_tagging::{normalize_tag_key, normalize_tag_name, LlmTaggingConfig},
	},
};
use sea_orm::prelude::*;

use crate::{error::CoreResult, utils::encryption::decrypt_string};

/// The statuses of an LLM tag suggestion which mean "this book is done or in
/// review" and can therefore be skipped on subsequent runs. Only
/// `RATE_LIMITED` records are retried.
pub const SETTLED_SUGGESTION_STATUSES: [LlmTagSuggestionStatus; 4] = [
	LlmTagSuggestionStatus::Suggested,
	LlmTagSuggestionStatus::AutoApplied,
	LlmTagSuggestionStatus::Accepted,
	LlmTagSuggestionStatus::Failed,
];

/// The decrypted LLM connection settings plus the tagging config
pub struct LlmSettings {
	pub url: String,
	pub model: String,
	pub decrypted_api_key: String,
	pub tagging_config: LlmTaggingConfig,
}

impl LlmSettings {
	/// Builds an [`LlmClient`] from these settings
	pub fn build_client(&self) -> LlmClient {
		LlmClient::new(
			self.url.clone(),
			self.model.clone(),
			self.decrypted_api_key.clone(),
			self.tagging_config.requests_per_second,
		)
	}
}

/// Loads and validates the LLM configuration from `server_config`, decrypting
/// the API key with the provided encryption key. Returns `None` when the LLM
/// is not configured (url, model, and encrypted API key must all be present).
pub async fn load_llm_settings(
	conn: &DatabaseConnection,
	encryption_key: &str,
) -> CoreResult<Option<LlmSettings>> {
	let Some(config) = server_config::Entity::find().one(conn).await? else {
		return Ok(None);
	};

	let (Some(url), Some(model), Some(encrypted_key)) = (
		config.llm_url.filter(|u| !u.trim().is_empty()),
		config.llm_model_name.filter(|m| !m.trim().is_empty()),
		config
			.llm_encrypted_api_key
			.filter(|k| !k.trim().is_empty()),
	) else {
		return Ok(None);
	};

	let decrypted_api_key = decrypt_string(&encrypted_key, &encryption_key.to_string())?;

	let tagging_config =
		LlmTaggingConfig::from_json(config.llm_tagging_config.as_ref()).sanitized();

	Ok(Some(LlmSettings {
		url,
		model,
		decrypted_api_key,
		tagging_config,
	}))
}

/// Cheap check used by the post-scan hook: true when the LLM is configured
/// and the tagging feature is enabled. Does not decrypt the API key.
pub async fn is_llm_tagging_enabled(conn: &DatabaseConnection) -> bool {
	let config = match server_config::Entity::find().one(conn).await {
		Ok(Some(config)) => config,
		_ => return false,
	};

	let llm_configured = config
		.llm_url
		.as_deref()
		.is_some_and(|u| !u.trim().is_empty())
		&& config
			.llm_model_name
			.as_deref()
			.is_some_and(|m| !m.trim().is_empty())
		&& config
			.llm_encrypted_api_key
			.as_deref()
			.is_some_and(|k| !k.trim().is_empty());

	llm_configured
		&& LlmTaggingConfig::from_json(config.llm_tagging_config.as_ref()).enabled
}

/// Approximates the number of LLM requests made today: per-book suggestions
/// that were actually attempted today, plus library analysis batches
/// completed today. Used to enforce the daily request limit.
pub async fn count_requests_today(conn: &DatabaseConnection) -> CoreResult<i64> {
	let start_of_day: DateTimeWithTimeZone = Utc::now()
		.date_naive()
		.and_time(NaiveTime::MIN)
		.and_local_timezone(Utc)
		.single()
		.map(|dt| dt.into())
		.unwrap_or_else(|| Utc::now().into());

	let suggestions = llm_tag_suggestion::Entity::find()
		.filter(llm_tag_suggestion::Column::UpdatedAt.gte(start_of_day))
		.filter(llm_tag_suggestion::Column::Status.is_in([
			LlmTagSuggestionStatus::Suggested,
			LlmTagSuggestionStatus::AutoApplied,
			LlmTagSuggestionStatus::Failed,
		]))
		.count(conn)
		.await?;

	// Note: for drafts I can only reasonably count batches completed today,
	// which is approximated by the drafts touched today and their cursors
	let drafts = llm_library_tag_draft::Entity::find()
		.filter(llm_library_tag_draft::Column::UpdatedAt.gte(start_of_day))
		.all(conn)
		.await?;
	let batches: i64 = drafts.iter().map(|d| d.completed_batches as i64).sum();

	Ok(suggestions as i64 + batches)
}

/// All existing tag names, used as the closed vocabulary handed to the LLM
pub async fn existing_tag_names(conn: &DatabaseConnection) -> CoreResult<Vec<String>> {
	let tags = tag::Entity::find().all(conn).await?;
	Ok(tags.into_iter().map(|t| t.name).collect())
}

/// Builds the LLM input for a single book, truncating the summary
pub fn build_book_tagging_input(
	media: &media::Model,
	metadata: Option<&media_metadata::Model>,
	max_summary_chars: u32,
) -> BookTaggingInput {
	let title = metadata
		.and_then(|m| m.title.clone())
		.unwrap_or_else(|| media.name.clone());

	let summary = metadata
		.and_then(|m| m.summary.clone())
		.map(|s| truncate(&s, max_summary_chars));

	BookTaggingInput {
		media_id: media.id.clone(),
		title,
		summary,
		writers: split_names(metadata.and_then(|m| m.writers.clone())),
		genres: split_names(metadata.and_then(|m| m.genres.clone())),
		year: metadata.and_then(|m| m.year),
	}
}

/// Builds the LLM input brief for a book in a library-wide analysis batch
pub fn build_library_book_brief(
	media: &media::Model,
	metadata: Option<&media_metadata::Model>,
	max_summary_chars: u32,
) -> LibraryBookBrief {
	let title = metadata
		.and_then(|m| m.title.clone())
		.unwrap_or_else(|| media.name.clone());

	let summary = metadata
		.and_then(|m| m.summary.clone())
		.map(|s| truncate(&s, max_summary_chars));

	LibraryBookBrief {
		media_id: media.id.clone(),
		title,
		summary,
		writers: split_names(metadata.and_then(|m| m.writers.clone())),
		genres: split_names(metadata.and_then(|m| m.genres.clone())),
	}
}

/// Normalizes and dedupes LLM-produced tag names, preserving order
pub fn normalize_tags(names: Vec<String>) -> Vec<String> {
	let mut seen = std::collections::HashSet::new();
	let mut result = Vec::new();
	for name in names {
		let Some(name) = normalize_tag_name(&name) else {
			continue;
		};
		let key = normalize_tag_key(&name);
		if seen.insert(key) {
			result.push(name);
		}
	}
	result
}

fn truncate(s: &str, max_chars: u32) -> String {
	let max = max_chars as usize;
	if s.chars().count() <= max {
		return s.to_string();
	}
	s.chars().take(max).collect()
}

fn split_names(raw: Option<String>) -> Vec<String> {
	raw.map(|s| {
		s.split(',')
			.map(|p| p.trim().to_string())
			.filter(|p| !p.is_empty())
			.collect()
	})
	.unwrap_or_default()
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_truncate() {
		assert_eq!(truncate("hello", 10), "hello");
		assert_eq!(truncate("hello", 4), "hell");
	}

	#[test]
	fn test_split_names() {
		assert_eq!(split_names(Some("A, B".to_string())), vec!["A", "B"]);
		assert_eq!(split_names(None), Vec::<String>::new());
	}
}
