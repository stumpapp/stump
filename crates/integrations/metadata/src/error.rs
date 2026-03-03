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

pub type MetadataResult<T> = Result<T, MetadataProviderError>;
