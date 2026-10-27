//! A minimal OpenAI-compatible chat/completions client used by the LLM
//! tagging features. It follows the same conventions as the metadata
//! integrations crate: exponential-backoff retries on 429/5xx and a
//! governor-based rate limiter in front of every request.
//!
//! Note: the API key provided to [`LlmClient::new`] is expected to be
//! decrypted by the caller and is only held in memory.

pub mod error;
pub mod tagging;
pub mod types;

pub use error::{LlmError, LlmResult};
pub use tagging::{
	BookTaggingInput, LibraryBatchAssignment, LibraryBatchResult, LibraryBookBrief,
	TagSuggestion,
};

use metadata_integrations::client::{build_client_with_retry, RetryClientConfig};
use reqwest_middleware::ClientWithMiddleware;
use std::{num::NonZeroU32, sync::Arc, time::Duration};
use types::{ChatMessage, ChatRequest, ChatResponse};

use governor::{
	clock::DefaultClock,
	state::{InMemoryState, NotKeyed},
	Quota, RateLimiter as GovernorLimiter,
};

const DEFAULT_MAX_RETRIES: u32 = 3;

/// A rate limiter supporting fractional requests-per-second values, e.g. 0.5
/// requests per second. Modeled after `metadata_integrations::RateLimiter`.
#[derive(Clone)]
pub struct RateLimiter {
	inner: Arc<GovernorLimiter<NotKeyed, InMemoryState, DefaultClock>>,
}

impl RateLimiter {
	/// Creates a new rate limiter with the specified requests per second
	///
	/// # Panics
	/// Panics if `requests_per_second` is not a positive, finite number
	pub fn new(requests_per_second: f64) -> Self {
		assert!(
			requests_per_second.is_finite() && requests_per_second > 0.0,
			"requests_per_second must be a positive, finite number"
		);

		let quota = if requests_per_second >= 1.0 {
			Quota::per_second(
				NonZeroU32::new(requests_per_second as u32).unwrap_or(NonZeroU32::MIN),
			)
		} else {
			let period = Duration::from_secs_f64(1.0 / requests_per_second);
			Quota::with_period(period)
				.expect("rate limit period must be non-zero")
				.allow_burst(NonZeroU32::MIN)
		};

		Self {
			inner: Arc::new(GovernorLimiter::direct(quota)),
		}
	}

	/// Waits until a request is permitted by the rate limiter
	pub async fn until_ready(&self) {
		self.inner.until_ready().await;
	}
}

/// An OpenAI-compatible chat/completions client
pub struct LlmClient {
	client: ClientWithMiddleware,
	rate_limiter: RateLimiter,
	base_url: String,
	model: String,
	api_key: String,
}

impl LlmClient {
	pub fn new(
		base_url: impl Into<String>,
		model: impl Into<String>,
		api_key: impl Into<String>,
		requests_per_second: f64,
	) -> Self {
		let base_url = base_url.into().trim_end_matches('/').to_string();

		Self {
			client: build_client_with_retry(
				reqwest::Client::new(),
				RetryClientConfig {
					max_retries: DEFAULT_MAX_RETRIES,
				},
			),
			rate_limiter: RateLimiter::new(requests_per_second),
			base_url,
			model: model.into(),
			api_key: api_key.into(),
		}
	}

	/// Performs a chat completion, returning the assistant message content
	/// along with the total token usage reported by the API (if present)
	pub async fn chat(
		&self,
		messages: Vec<ChatMessage>,
	) -> LlmResult<(String, Option<u64>)> {
		self.rate_limiter.until_ready().await;

		let body = ChatRequest {
			model: self.model.clone(),
			messages,
			// Note: some OpenAI-compatible providers choke on very low
			// temperatures or non-standard params, so keep it conservative
			temperature: Some(0.2),
		};

		let url = format!("{}/chat/completions", self.base_url);

		let response = self
			.client
			.post(url)
			.bearer_auth(&self.api_key)
			.json(&body)
			.send()
			.await?;

		let status = response.status();

		if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
			return Err(LlmError::RateLimited);
		}

		if status.is_server_error() {
			return Err(LlmError::Other(format!(
				"LLM API returned a server error: {status}"
			)));
		}

		let response = response.error_for_status()?;

		let parsed: ChatResponse = response.json().await?;

		let choice = parsed.choices.first().ok_or(LlmError::EmptyResponse)?;

		let tokens = parsed
			.usage
			.map(|u| u.prompt_tokens.saturating_add(u.completion_tokens));

		Ok((choice.message.content.clone(), tokens))
	}
}

/// Extracts a JSON object from an LLM response, tolerating common artifacts
/// such as markdown code fences or leading/trailing prose
pub fn extract_json(content: &str) -> LlmResult<serde_json::Value> {
	let trimmed = content.trim();

	let candidates = [
		trimmed,
		trimmed
			.trim_start_matches("```json")
			.trim_start_matches("```"),
	];

	for candidate in candidates {
		let candidate = candidate.trim();
		// strip a trailing code fence if present
		let candidate = candidate.strip_suffix("```").unwrap_or(candidate);
		let candidate = candidate.trim();

		if let Ok(value) = serde_json::from_str::<serde_json::Value>(candidate) {
			return Ok(value);
		}

		// fall back to the outermost JSON object/array embedded in the text
		if let Some(value) = extract_embedded_json(candidate) {
			if let Ok(value) = serde_json::from_str::<serde_json::Value>(&value) {
				return Ok(value);
			}
		}
	}

	Err(LlmError::InvalidOutput(format!(
		"response did not contain valid JSON: {}",
		truncate_for_error(content)
	)))
}

fn extract_embedded_json(content: &str) -> Option<String> {
	for (open, close) in [('{', '}'), ('[', ']')] {
		let Some(start) = content.find(open) else {
			continue;
		};
		let Some(end) = content.rfind(close) else {
			continue;
		};
		if end > start {
			return Some(content[start..=end].to_string());
		}
	}
	None
}

fn truncate_for_error(content: &str) -> String {
	if content.len() <= 200 {
		content.to_string()
	} else {
		format!("{}...", &content[..200])
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn test_rate_limiter_fractional() {
		let limiter = RateLimiter::new(0.5);
		// should not panic and should permit the first request
		limiter
			.inner
			.check()
			.expect("first request should be allowed");
	}

	#[test]
	#[should_panic(expected = "requests_per_second must be a positive, finite number")]
	fn test_rate_limiter_zero() {
		let _ = RateLimiter::new(0.0);
	}

	#[test]
	fn test_extract_json_plain() {
		let value = extract_json(r#"{"tags": []}"#).unwrap();
		assert!(value.is_object());
	}

	#[test]
	fn test_extract_json_fenced() {
		let value = extract_json("```json\n{\"tags\": [\"a\"]}\n```").unwrap();
		assert!(value.is_object());
	}

	#[test]
	fn test_extract_json_with_prose() {
		let value =
			extract_json("Here is the result: {\"new_tags\": [\"x\"]} hope it helps")
				.unwrap();
		assert!(value.is_object());
	}

	#[test]
	fn test_extract_json_invalid() {
		assert!(extract_json("no json at all").is_err());
	}
}
