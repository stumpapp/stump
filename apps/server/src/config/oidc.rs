use openidconnect::{
	core::{
		CoreAuthDisplay, CoreAuthPrompt, CoreAuthenticationFlow, CoreClient,
		CoreErrorResponseType, CoreGenderClaim, CoreJsonWebKey,
		CoreJweContentEncryptionAlgorithm, CoreProviderMetadata, CoreRevocableToken,
		CoreRevocationErrorResponse, CoreTokenIntrospectionResponse, CoreTokenResponse,
	},
	AuthorizationCode, Client, ClientId, ClientSecret, CsrfToken, EmptyAdditionalClaims,
	EndpointMaybeSet, EndpointNotSet, EndpointSet, IssuerUrl, Nonce, RedirectUrl, Scope,
	StandardErrorResponse, TokenResponse,
};
use serde::{Deserialize, Serialize};
use stump_core::config::OidcConfig;

use crate::errors::APIError;

// lol this is an absurd type alias
pub type StumpOidcClient = Client<
	EmptyAdditionalClaims,
	CoreAuthDisplay,
	CoreGenderClaim,
	CoreJweContentEncryptionAlgorithm,
	CoreJsonWebKey,
	CoreAuthPrompt,
	StandardErrorResponse<CoreErrorResponseType>,
	CoreTokenResponse,
	CoreTokenIntrospectionResponse,
	CoreRevocableToken,
	CoreRevocationErrorResponse,
	EndpointSet,
	EndpointNotSet,
	EndpointNotSet,
	EndpointNotSet,
	EndpointMaybeSet,
	EndpointMaybeSet,
>;

/// Create OIDC client from configuration
pub async fn create_oidc_client(
	config: &OidcConfig,
	frontend_url: &str,
) -> Result<(reqwest::Client, StumpOidcClient), APIError> {
	if !config.is_configured() {
		return Err(APIError::OIDCConfigurationInvalid);
	}

	let issuer_url = IssuerUrl::new(config.issuer_url.clone()).map_err(|error| {
		tracing::error!(?error, "Invalid issuer URL for OIDC");
		APIError::OIDCConfigurationInvalid
	})?;

	let http_client = reqwest::ClientBuilder::new()
		.redirect(reqwest::redirect::Policy::none())
		.build()
		.map_err(|error| {
			tracing::error!(?error, "Failed to create HTTP client for OIDC");
			APIError::InternalServerError(format!(
				"Failed to create HTTP client: {}",
				error
			))
		})?;

	let provider_metadata =
		CoreProviderMetadata::discover_async(issuer_url, &http_client)
			.await
			.map_err(|e| {
				tracing::error!(?e, "OIDC discovery failed");
				APIError::InternalServerError(format!("OIDC discovery failed: {}", e))
			})?;

	let redirect_uri = format!("{}/api/v2/auth/oidc/callback", frontend_url);
	let redirect_url = RedirectUrl::new(redirect_uri).map_err(|e| {
		APIError::InternalServerError(format!("Invalid redirect URI: {}", e))
	})?;

	let client = CoreClient::from_provider_metadata(
		provider_metadata,
		ClientId::new(config.client_id.clone()),
		Some(ClientSecret::new(config.client_secret.clone())),
	)
	.set_redirect_uri(redirect_url);

	Ok((http_client, client))
}

/// Get the OIDC authorization URL to redirect the user to
pub fn get_oidc_authorize_url(
	client: &StumpOidcClient,
	scopes: &[String],
	state: &str,
) -> String {
	let scope_vec: Vec<Scope> = scopes.iter().map(|s| Scope::new(s.clone())).collect();
	let state_owned = state.to_string();

	let (authorize_url, _, _) = client
		.authorize_url(
			CoreAuthenticationFlow::AuthorizationCode,
			move || CsrfToken::new(state_owned),
			Nonce::new_random,
		)
		.add_scopes(scope_vec)
		.url();

	authorize_url.to_string()
}

// TODO(oidc): Support permissions from OIDC claims? See https://pocket-id.org/docs/client-examples/audiobookshelf for an example

/// Claims extracted from OIDC token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OidcClaims {
	/// The unique identifier for the user from the provider
	pub subject: String,
	/// The user's email address
	pub email: String,
	/// The user's full name, if the provider supplies it
	pub name: Option<String>,
	/// A URL to the user's profile picture, if one exists
	pub picture: Option<String>,
}

/// Exchange authorization code for tokens and extract claims
pub async fn exchange_code_for_claims(
	http_client: &reqwest::Client,
	client: &StumpOidcClient,
	code: String,
) -> Result<OidcClaims, APIError> {
	let token_response = client
		.exchange_code(AuthorizationCode::new(code))?
		.request_async(http_client)
		.await
		.map_err(|error| {
			tracing::error!(?error, "Token exchange failed");
			APIError::OIDCTokenExchangeFailed(error.to_string())
		})?;

	let id_token = token_response
		.id_token()
		.ok_or(APIError::OIDCMissingToken)?;

	let token_verifier = client.id_token_verifier();
	let id_token_claims = id_token.claims(&token_verifier, nonce_verifier)?;

	Ok(OidcClaims {
		subject: id_token_claims.subject().to_string(),
		email: id_token_claims
			.email()
			.ok_or(APIError::OIDCMissingEmail)?
			.to_string(),
		name: id_token_claims
			.name()
			.and_then(|n| n.get(None))
			.map(|n| n.to_string()),
		picture: id_token_claims
			.picture()
			.and_then(|p| p.get(None))
			.map(|p| p.to_string()),
	})
}

fn nonce_verifier(_nonce: Option<&Nonce>) -> Result<(), String> {
	Ok(())
}
