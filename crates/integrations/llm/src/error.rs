#[derive(thiserror::Error, Debug)]
pub enum LlmError {
	#[error("The request failed: {0}")]
	ReqwestError(#[from] reqwest::Error),
	#[error("The request failed (middleware): {0}")]
	MiddlewareReqwestError(#[from] reqwest_middleware::Error),
	#[error("Failed to parse response: {0}")]
	ParseError(#[from] serde_json::Error),
	#[error("The LLM API returned an empty response")]
	EmptyResponse,
	#[error("Rate limited after exhausting retries")]
	RateLimited,
	#[error("The LLM response could not be parsed as the expected JSON: {0}")]
	InvalidOutput(String),
	#[error("{0}")]
	Other(String),
}

impl LlmError {
	/// Returns true if this error is a rate limit (429)
	pub fn is_rate_limited(&self) -> bool {
		match self {
			Self::RateLimited => true,
			Self::ReqwestError(e) => e
				.status()
				.is_some_and(|s| s == reqwest::StatusCode::TOO_MANY_REQUESTS),
			Self::MiddlewareReqwestError(e) => e.to_string().contains("429"),
			_ => false,
		}
	}
}

pub type LlmResult<T> = Result<T, LlmError>;
