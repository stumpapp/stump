use async_graphql::{InputObject, Result};
use models::{entity::metadata_provider_config, shared::enums::MetadataProvider};
use sea_orm::{prelude::Decimal, ActiveValue::NotSet, Set, Unchanged};
use stump_core::utils::encryption::encrypt_string;

/// Input object for creating a metadata provider configuration
#[derive(InputObject)]
pub struct CreateMetadataProviderConfigInput {
	/// The provider type
	pub provider_type: MetadataProvider,
	/// The API token for authenticating with the provider
	pub api_token: String,
	/// Whether the provider is enabled
	pub enabled: Option<bool>,
	/// The confidence threshold for auto-applying matches (0.0 - 1.0, defaults to 0.95).
	/// This will only be considered if [Self::auto_apply_matches] is true
	pub auto_apply_threshold: Option<f64>,
	/// Whether to automatically apply matches that meet the threshold
	pub auto_apply_matches: Option<bool>,
	/// Optional expiration date for the API key. This is exclusively a QOL thing,
	/// since the creds don't live within the management domain of Stump
	pub api_key_expires_at: Option<chrono::DateTime<chrono::FixedOffset>>,
}

impl CreateMetadataProviderConfigInput {
	pub async fn try_into_active_model(
		self,
		encryption_key: &String,
	) -> Result<metadata_provider_config::ActiveModel> {
		let encrypted_api_token = encrypt_string(&self.api_token, encryption_key)?;

		let auto_apply_threshold = self.auto_apply_threshold.map(|t| {
			Decimal::from_f64_retain(t).unwrap_or_else(|| {
				Decimal::from_str_exact("0.95").expect("This should never happen!")
			})
		});

		Ok(metadata_provider_config::ActiveModel {
			id: NotSet,
			provider_type: Set(self.provider_type),
			enabled: Set(self.enabled.unwrap_or(true)),
			encrypted_api_token: Set(Some(encrypted_api_token)),
			api_key_expires_at: Set(self.api_key_expires_at),
			auto_apply_threshold: auto_apply_threshold.map(Set).unwrap_or(NotSet),
			auto_apply_matches: self.auto_apply_matches.map(Set).unwrap_or(NotSet),
			created_at: NotSet,
			updated_at: NotSet,
		})
	}
}

// I always pinch myself for not adding patch because full update is so annoying on the frontend,
// so you are welcome future me

/// A patch equivalent of [CreateMetadataProviderConfigInput], i.e. just with optional fields.
#[derive(InputObject)]
pub struct PatchMetadataProviderConfigInput {
	/// The API token for authenticating with the provider
	pub api_token: Option<String>,
	/// Whether the provider is enabled
	pub enabled: Option<bool>,
	/// The confidence threshold for auto-applying matches (0.0 - 1.0)
	pub auto_apply_threshold: Option<f64>,
	/// Whether to automatically apply matches that meet the threshold
	pub auto_apply_matches: Option<bool>,
	/// Optional expiration date for the API key. This is exclusively a QOL thing,
	/// since the creds don't live within the management domain of Stump
	pub api_key_expires_at: Option<chrono::DateTime<chrono::FixedOffset>>,
}

impl PatchMetadataProviderConfigInput {
	pub async fn apply_to_model(
		self,
		model: metadata_provider_config::Model,
		encryption_key: &String,
	) -> Result<metadata_provider_config::ActiveModel> {
		let encrypted_api_token = self
			.api_token
			.map(|token| encrypt_string(&token, encryption_key))
			.transpose()?;

		let auto_apply_threshold = self.auto_apply_threshold.map(|t| {
			Decimal::from_f64_retain(t).unwrap_or_else(|| {
				Decimal::from_str_exact("0.95").expect("This should never happen!")
			})
		});

		Ok(metadata_provider_config::ActiveModel {
			id: Unchanged(model.id),
			provider_type: Unchanged(model.provider_type),
			enabled: self.enabled.map(Set).unwrap_or(Unchanged(model.enabled)),
			encrypted_api_token: encrypted_api_token
				.map(|t| Set(Some(t)))
				.unwrap_or(Unchanged(model.encrypted_api_token)),
			api_key_expires_at: self
				.api_key_expires_at
				.map(|t| Set(Some(t)))
				.unwrap_or(Unchanged(model.api_key_expires_at)),
			auto_apply_threshold: auto_apply_threshold
				.map(Set)
				.unwrap_or(Unchanged(model.auto_apply_threshold)),
			auto_apply_matches: self
				.auto_apply_matches
				.map(Set)
				.unwrap_or(Unchanged(model.auto_apply_matches)),
			created_at: Unchanged(model.created_at),
			..Default::default()
		})
	}
}
