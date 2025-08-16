use chrono::{DateTime, Duration, FixedOffset, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use once_cell::sync::Lazy;
use rand::distributions::{Alphanumeric, DistString};
use serde::{Deserialize, Serialize};
use stump_core::config::StumpConfig;

use crate::errors::{APIError, APIResult};

// TODO(219): Support refresh tokens

/// The secret used to sign the JWT tokens, recycles every time the server is restarted*
///
/// Note: _Technically_ it will only be initialized after the first attempt to use it, not
/// necessarily when the server starts. I don't see an issue with this, but it's worth noting.
static JWT_SECRET: Lazy<String> =
	Lazy::new(|| Alphanumeric.sample_string(&mut rand::thread_rng(), 60));

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
	sub: String,
	iat: usize,
	exp: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedToken {
	pub access_token: String,
	pub expires_at: DateTime<FixedOffset>,
	// TODO(219): Support refresh tokens
}

/// A function that will take a user ID (string) and return a JWT token
pub(crate) fn create_user_jwt(
	user_id: &str,
	config: &StumpConfig,
) -> APIResult<CreatedToken> {
	let now = Utc::now();
	let iat = now.timestamp() as usize;
	let exp = (now + Duration::seconds(config.access_token_ttl)).timestamp() as usize;
	let expires_at = DateTime::from(now + Duration::seconds(config.access_token_ttl));
	let claims = Claims {
		sub: user_id.to_string(),
		exp,
		iat,
	};

	let token = encode(
		&Header::default(),
		&claims,
		&EncodingKey::from_secret(JWT_SECRET.as_bytes()),
	)
	.map_err(|e| {
		tracing::error!("Failed to encode JWT: {:?}", e);
		APIError::InternalServerError("Failed to encode JWT".to_string())
	})?;

	Ok(CreatedToken {
		access_token: token,
		expires_at,
	})
}

/// A function that will take a JWT token and return the user ID
pub(crate) fn verify_user_jwt(token: &str) -> APIResult<String> {
	let token_data = decode::<Claims>(
		token,
		&DecodingKey::from_secret(JWT_SECRET.as_bytes()),
		&Validation::default(),
	)
	.map_err(|e| {
		tracing::error!("Failed to decode JWT: {:?}", e);
		APIError::Unauthorized
	})?;

	Ok(token_data.claims.sub)
}
