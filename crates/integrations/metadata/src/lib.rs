pub mod error;
mod provider;
mod providers;
pub mod rate_limit;
pub(crate) mod serde_utils;
pub mod types;

pub use error::{MetadataProviderError, MetadataResult};
pub use provider::MetadataProvider;
pub use rate_limit::RateLimiter;
pub use types::{
	ExternalMediaMetadata, ExternalMetadata, ExternalSeriesMetadata, MatchCandidate,
	MediaType, PublicationStatus, SearchQuery,
};

use providers::HardcoverClient;

pub fn create_provider(
	provider_type: &str,
	api_token: String,
) -> MetadataResult<Box<dyn MetadataProvider + Send + Sync>> {
	match provider_type {
		"HARDCOVER" => Ok(Box::new(HardcoverClient::new(api_token, None))),
		_ => Err(MetadataProviderError::UnsupportedProvider(
			provider_type.to_string(),
		)),
	}
}
