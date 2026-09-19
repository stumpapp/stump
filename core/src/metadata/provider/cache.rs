use std::{collections::HashMap, sync::Arc};

use metadata_integrations::{create_provider, MetadataProvider, MetadataProviderError};
use models::{
	entity::metadata_provider_config,
	shared::enums::MetadataProvider as MetadataProviderEnum,
};
use tokio::sync::RwLock;

use crate::utils::encryption::decrypt_string;

/// A cache for lazily-loaded metadata provider clients
pub struct ProviderClientCache {
	clients:
		RwLock<HashMap<MetadataProviderEnum, Arc<dyn MetadataProvider + Send + Sync>>>,
	encryption_key: String, // The encryption key used to decrypt API tokens
}

impl ProviderClientCache {
	/// Create a new provider client cache with the given encryption key
	pub fn new(encryption_key: String) -> Self {
		Self {
			clients: RwLock::new(HashMap::new()),
			encryption_key,
		}
	}

	/// Get or create a provider client for the given configuration
	pub async fn get_or_create(
		&self,
		config: &metadata_provider_config::Model,
	) -> Result<Arc<dyn MetadataProvider + Send + Sync>, ProviderCacheError> {
		{
			let clients = self.clients.read().await;
			if let Some(client) = clients.get(&config.provider_type) {
				return Ok(Arc::clone(client));
			}
		}

		let encrypted_token = config
			.encrypted_api_token
			.as_ref()
			.ok_or(ProviderCacheError::MissingApiToken)?;

		let decrypted_token = decrypt_string(encrypted_token, &self.encryption_key)
			.map_err(|e| ProviderCacheError::DecryptionFailed(e.to_string()))?;

		let provider_type_str = config.provider_type.to_string();
		let client = create_provider(&provider_type_str, decrypted_token)
			.map_err(ProviderCacheError::ProviderCreationFailed)?;

		let client_arc: Arc<dyn MetadataProvider + Send + Sync> = Arc::from(client);

		{
			let mut clients = self.clients.write().await;
			clients.insert(config.provider_type, Arc::clone(&client_arc));
		}

		Ok(client_arc)
	}

	/// Clear all cached clients
	pub async fn clear(&self) {
		let mut clients = self.clients.write().await;
		clients.clear();
	}
}

#[derive(Debug, thiserror::Error)]
pub enum ProviderCacheError {
	#[error("Provider has no API token configured")]
	MissingApiToken,
	#[error("Failed to decrypt API token: {0}")]
	DecryptionFailed(String),
	#[error("Failed to create provider: {0}")]
	ProviderCreationFailed(#[from] MetadataProviderError),
}
