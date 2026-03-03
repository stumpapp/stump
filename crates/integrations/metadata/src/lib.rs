pub mod client;
pub mod error;
pub mod merge;
mod provider;
mod providers;
pub mod rate_limit;
pub mod scoring;
pub(crate) mod serde_utils;
pub mod types;

pub use client::build_client_with_retry;
pub use error::{MetadataProviderError, MetadataResult};
pub use merge::{AutoApplyConfig, FieldMerger, MergeStrategy, MetadataFieldOverride};
pub use provider::MetadataProvider;
pub use rate_limit::RateLimiter;
pub use scoring::MatchScorer;
pub use types::{
	ConfidenceFactor, ExternalMediaMetadata, ExternalMetadata, ExternalSeriesMetadata,
	MatchCandidate, MediaType, MetadataField, PublicationStatus, SearchQuery,
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
