#[derive(thiserror::Error, Debug)]
pub enum MetadataProviderError {
	#[error("The request failed: {0}")]
	ReqwestError(#[from] reqwest::Error),
	#[error("The request failed (middleware): {0}")]
	MiddlewareReqwestError(#[from] reqwest_middleware::Error),
	#[error("Failed to parse response: {0}")]
	ParseError(#[from] serde_json::Error),
	#[error("This operation is not supported by the provider")]
	OperationNotSupported,
	#[error("A token is required for this provider but was not provided")]
	MissingToken,
	#[error("The provider returned an empty response")]
	EmptyResponse,
	#[error("Rate limited after exhausting retries")]
	RateLimited,
	#[error("Resource not found: {0}")]
	NotFound(String),
	#[error("Unsupported provider: {0}")]
	UnsupportedProvider(String),
	#[error("{0}")]
	Other(String),
}

impl MetadataProviderError {
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

pub type MetadataResult<T> = Result<T, MetadataProviderError>;
