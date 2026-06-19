use openidconnect::{
	core::{
		CoreAuthDisplay, CoreAuthPrompt, CoreAuthenticationFlow, CoreClient,
		CoreErrorResponseType, CoreGenderClaim, CoreJsonWebKey,
		CoreJweContentEncryptionAlgorithm, CoreProviderMetadata, CoreRevocableToken,
		CoreRevocationErrorResponse, CoreTokenIntrospectionResponse, CoreTokenResponse,
		CoreUserInfoClaims,
	},
	AuthorizationCode, Client, ClientId, ClientSecret, CsrfToken, EmptyAdditionalClaims,
	EndpointMaybeSet, EndpointNotSet, EndpointSet, IssuerUrl, Nonce, OAuth2TokenResponse,
	PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope, StandardErrorResponse,
	TokenResponse,
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

/// Cached OIDC client state, initialized once at server startup.
/// Holds the HTTP client and discovered provider metadata, avoiding
/// repeated metadata discovery on every OIDC login request.
#[derive(Clone)]
pub struct OidcProvider {
	pub http_client: oauth2_reqwest::ReqwestClient,
	provider_metadata: CoreProviderMetadata,
	client_id: String,
	client_secret: String,
}

impl OidcProvider {
	/// Build the HTTP client and discover provider metadata.
	/// This performs the expensive I/O (metadata discovery) so it should
	/// be called once at startup and reused.
	pub async fn new(config: &OidcConfig) -> Result<Self, APIError> {
		let issuer_url = IssuerUrl::new(config.issuer_url.clone()).map_err(|error| {
			tracing::error!(?error, "Invalid issuer URL for OIDC");
			APIError::OIDCConfigurationInvalid
		})?;

		let mut client_builder =
			reqwest::ClientBuilder::new().redirect(reqwest::redirect::Policy::none());

		if let Some(ca_cert_path) = &config.ca_cert_file {
			let cert_bytes = tokio::fs::read(ca_cert_path).await.map_err(|error| {
				tracing::error!(?error, path = %ca_cert_path, "Failed to read CA certificate file for OIDC");
				APIError::InternalServerError(format!(
					"Failed to read CA certificate file: {}",
					error
				))
			})?;
			let cert = reqwest::Certificate::from_pem(&cert_bytes).map_err(|error| {
				tracing::error!(?error, path = %ca_cert_path, "Failed to parse CA certificate file for OIDC");
				APIError::InternalServerError(format!(
					"Failed to parse CA certificate '{}': {}",
					ca_cert_path, error
				))
			})?;
			client_builder = client_builder.add_root_certificate(cert);
		}

		let http_client = oauth2_reqwest::ReqwestClient::from(
			client_builder.build().map_err(|error| {
				tracing::error!(?error, "Failed to create HTTP client for OIDC");
				APIError::InternalServerError(format!(
					"Failed to create HTTP client: {}",
					error
				))
			})?,
		);

		let provider_metadata =
			CoreProviderMetadata::discover_async(issuer_url, &http_client)
				.await
				.map_err(|e| {
					tracing::error!(?e, "OIDC discovery failed");
					APIError::InternalServerError(format!("OIDC discovery failed: {}", e))
				})?;

		Ok(Self {
			http_client,
			provider_metadata,
			client_id: config.client_id.clone(),
			client_secret: config.client_secret.clone(),
		})
	}

	/// Create a per-request [StumpOidcClient] from the cached state.
	/// This is cheap — no I/O, just constructs the client with the correct redirect URL.
	pub fn create_client(&self, frontend_url: &str) -> Result<StumpOidcClient, APIError> {
		let redirect_uri = format!("{}/api/v2/auth/oidc/callback", frontend_url);
		let redirect_url = RedirectUrl::new(redirect_uri).map_err(|e| {
			tracing::error!(?e, "Invalid redirect URI constructed from frontend URL");
			APIError::InternalServerError(format!(
				"Invalid redirect URI constructed from frontend URL: {}",
				frontend_url
			))
		})?;

		Ok(CoreClient::from_provider_metadata(
			self.provider_metadata.clone(),
			ClientId::new(self.client_id.clone()),
			Some(ClientSecret::new(self.client_secret.clone())),
		)
		.set_redirect_uri(redirect_url))
	}
}

/// Get the OIDC authorization URL to redirect the user to
pub fn get_oidc_authorize_url(
	client: &StumpOidcClient,
	scopes: &[String],
	state: &str,
	pkce_challenge: Option<PkceCodeChallenge>,
) -> String {
	let scope_vec: Vec<Scope> = scopes.iter().map(|s| Scope::new(s.clone())).collect();
	let state_owned = state.to_string();

	let mut auth_request = client
		.authorize_url(
			CoreAuthenticationFlow::AuthorizationCode,
			move || CsrfToken::new(state_owned),
			Nonce::new_random,
		)
		.add_scopes(scope_vec);

	if let Some(challenge) = pkce_challenge {
		auth_request = auth_request.set_pkce_challenge(challenge);
	}

	let (authorize_url, _, _) = auth_request.url();
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
	http_client: &oauth2_reqwest::ReqwestClient,
	client: &StumpOidcClient,
	code: String,
	extra_audiences: Vec<String>,
	pkce_verifier: Option<PkceCodeVerifier>,
) -> Result<OidcClaims, APIError> {
	let mut request = client.exchange_code(AuthorizationCode::new(code))?;
	if let Some(verifier) = pkce_verifier {
		request = request.set_pkce_verifier(verifier);
	}
	let token_response = request.request_async(http_client).await.map_err(|error| {
		tracing::error!(?error, "Token exchange failed");
		APIError::OIDCTokenExchangeFailed(error.to_string())
	})?;

	let id_token = token_response
		.id_token()
		.ok_or(APIError::OIDCMissingToken)?;

	let token_verifier =
		client
			.id_token_verifier()
			.set_other_audience_verifier_fn(move |aud| {
				extra_audiences.iter().any(|a| a.as_str() == aud.as_str())
			});
	let id_token_claims = id_token.claims(&token_verifier, nonce_verifier)?;

	let access_token = token_response.access_token();
	let user_info: CoreUserInfoClaims = client
		.user_info(access_token.to_owned(), None)?
		.request_async(http_client)
		.await
		.map_err(|error| {
			tracing::error!(?error, "User info fetch failed");
			APIError::OIDCTokenExchangeFailed(error.to_string())
		})?;

	Ok(OidcClaims {
		subject: id_token_claims.subject().to_string(),
		email: user_info
			.email()
			.ok_or(APIError::OIDCMissingEmail)?
			.to_string(),
		name: user_info
			.name()
			.and_then(|n| n.get(None))
			.map(|n| n.to_string()),
		picture: user_info
			.picture()
			.and_then(|p| p.get(None))
			.map(|p| p.to_string()),
	})
}

fn nonce_verifier(_nonce: Option<&Nonce>) -> Result<(), String> {
	Ok(())
}
