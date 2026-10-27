use serde::{Deserialize, Serialize};

use crate::{error::LlmResult, extract_json, types::ChatMessage, LlmClient};

/// The (user-controlled) metadata of a book, used as *content* for the LLM.
/// It is never interpolated into the system prompt to mitigate prompt injection.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BookTaggingInput {
	pub media_id: String,
	pub title: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub summary: Option<String>,
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub writers: Vec<String>,
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub genres: Vec<String>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub year: Option<i32>,
}

/// A single suggested tag with a confidence score and optional reasoning
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagSuggestion {
	pub name: String,
	pub confidence: f64,
	#[serde(default)]
	pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SuggestTagsResponse {
	#[serde(default)]
	tags: Vec<TagSuggestion>,
}

/// A brief of one book for library-wide batch analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryBookBrief {
	pub media_id: String,
	pub title: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub summary: Option<String>,
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub writers: Vec<String>,
	#[serde(skip_serializing_if = "Vec::is_empty", default)]
	pub genres: Vec<String>,
}

/// A single media -> tags assignment produced by a library batch analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryBatchAssignment {
	pub media_id: String,
	pub tags: Vec<String>,
}

/// The result of one library batch: tags to add to the global vocabulary and
/// the per-book assignments
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryBatchResult {
	#[serde(default)]
	pub new_tags: Vec<String>,
	#[serde(default)]
	pub assignments: Vec<LibraryBatchAssignment>,
	/// Total tokens reported for the request, if known
	#[serde(default)]
	pub tokens_used: u64,
}

const TAGGING_SYSTEM_PROMPT: &str = r#"You are a library tagging assistant. Given the metadata of a single book, suggest between 1 and 8 descriptive tags (genres, themes, tone, audience, format) for it.

Rules:
- PREFER reusing tags from the provided existing tag list when they fit. Only propose new tags when no existing tag fits.
- Tags must be short (max 50 characters), lowercase-ish human readable labels.
- Do not repeat the author name, series name, or book title as a tag.
- Respond with ONLY a JSON object, no markdown, no commentary, in the exact shape:
  {"tags": [{"name": "<tag>", "confidence": <number between 0 and 1>, "reason": "<short reason>"}]}"#;

const LIBRARY_BATCH_SYSTEM_PROMPT: &str = r#"You are a library tagging assistant. You will be given a JSON list of books and the library's current global tag vocabulary. Your job:

1. Return an updated global tag vocabulary. It must include every tag from the current vocabulary (you may NOT remove or rename existing tags) plus any new tags required to describe the books. Only add a new tag when no existing tag fits.
2. Assign tags to each book from the (updated) vocabulary.

Rules:
- Tags must be short (max 50 characters).
- Do not repeat author names, series names, or book titles as tags.
- Every book should receive at least one tag when possible.
- Only reference media_id values that appear in the provided list.
- Respond with ONLY a JSON object, no markdown, no commentary, in the exact shape:
  {"new_tags": ["<tag>", ...], "assignments": [{"mediaId": "<id>", "tags": ["<tag>", ...]}, ...]}
  where "new_tags" contains ONLY tags that were not already in the current vocabulary."#;

impl LlmClient {
	/// Suggests tags for a single book. The book metadata is passed as user
	/// content (never part of the system prompt), and the response is forced
	/// through JSON parsing. One retry with a corrective message is attempted
	/// when the first response is not valid JSON.
	pub async fn suggest_tags(
		&self,
		book: &BookTaggingInput,
		existing_tags: &[String],
	) -> LlmResult<(Vec<TagSuggestion>, u64)> {
		let book_json = serde_json::to_string(book)
			.map_err(|e| crate::LlmError::Other(e.to_string()))?;

		let user_content = format!(
			"Existing tag vocabulary (prefer these):\n{}\n\nBook metadata:\n{}",
			serde_json::to_string(existing_tags).unwrap_or_else(|_| "[]".to_string()),
			book_json
		);

		let mut messages = vec![
			ChatMessage::system(TAGGING_SYSTEM_PROMPT),
			ChatMessage::user(user_content),
		];

		let mut total_tokens = 0u64;

		// Note: the response is forced through JSON parsing; if the model
		// returns garbage we retry once with a corrective message
		for attempt in 0..2 {
			let (content, tokens) = self.chat(messages.clone()).await?;
			total_tokens += tokens.unwrap_or(0);

			match extract_json(&content).and_then(|json| {
				serde_json::from_value::<SuggestTagsResponse>(json)
					.map_err(crate::LlmError::from)
			}) {
				Ok(parsed) => {
					return Ok((parsed.tags, total_tokens));
				},
				Err(_) if attempt == 0 => {
					messages.push(ChatMessage {
						role: "assistant".to_string(),
						content,
					});
					messages.push(ChatMessage::user(
						"Your previous response was not valid JSON in the required shape. Respond again with ONLY the JSON object: {\"tags\": [{\"name\": \"...\", \"confidence\": 0.9, \"reason\": \"...\"}]}",
					));
				},
				Err(e) => {
					return Err(crate::LlmError::InvalidOutput(format!(
						"failed to parse tag suggestions: {e}"
					)));
				},
			}
		}

		unreachable!()
	}

	/// Analyzes a batch of books for the library-wide tag recommendation
	/// feature. Returns tags to add to the global vocabulary plus per-book
	/// assignments. One corrective retry on invalid JSON, like
	/// [`LlmClient::suggest_tags`].
	pub async fn recommend_tags_for_batch(
		&self,
		books: &[LibraryBookBrief],
		existing_tags: &[String],
	) -> LlmResult<(LibraryBatchResult, u64)> {
		let books_json = serde_json::to_string(books)
			.map_err(|e| crate::LlmError::Other(e.to_string()))?;

		let user_content = format!(
			"Current global tag vocabulary:\n{}\n\nBooks in this batch:\n{}",
			serde_json::to_string(existing_tags).unwrap_or_else(|_| "[]".to_string()),
			books_json
		);

		let mut messages = vec![
			ChatMessage::system(LIBRARY_BATCH_SYSTEM_PROMPT),
			ChatMessage::user(user_content),
		];

		let mut total_tokens = 0u64;

		for attempt in 0..2 {
			let (content, tokens) = self.chat(messages.clone()).await?;
			total_tokens += tokens.unwrap_or(0);

			let json = match extract_json(&content) {
				Ok(json) => json,
				Err(_) if attempt == 0 => {
					messages.push(ChatMessage {
						role: "assistant".to_string(),
						content,
					});
					messages.push(ChatMessage::user(
						"Your previous response was not valid JSON in the required shape. Respond again with ONLY the JSON object: {\"new_tags\": [\"...\"], \"assignments\": [{\"mediaId\": \"...\", \"tags\": [\"...\"]}]}",
					));
					continue;
				},
				Err(e) => {
					return Err(crate::LlmError::InvalidOutput(format!(
						"failed to parse batch result: {e}"
					)));
				},
			};

			match serde_json::from_value::<LibraryBatchResult>(json) {
				Ok(mut result) => {
					result.tokens_used = total_tokens;
					return Ok((result, total_tokens));
				},
				Err(_) if attempt == 0 => {
					messages.push(ChatMessage {
						role: "assistant".to_string(),
						content,
					});
					messages.push(ChatMessage::user(
						"Your previous response did not match the required JSON schema. Respond again with ONLY the JSON object: {\"new_tags\": [\"...\"], \"assignments\": [{\"mediaId\": \"...\", \"tags\": [\"...\"]}]}",
					));
				},
				Err(e) => {
					return Err(crate::LlmError::InvalidOutput(format!(
						"failed to parse batch result: {e}"
					)));
				},
			}
		}

		unreachable!()
	}
}
