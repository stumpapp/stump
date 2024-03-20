use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use prisma_client_rust::chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::errors::{APIError, APIResult};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
	sub: String,
	iat: usize,
	exp: usize,
}

/// A function that will take a user ID (string) and return a JWT token
#[allow(dead_code)] // TODO: Remove this once the function is used
pub(crate) fn create_session_jwt(user_id: &str) -> APIResult<String> {
	let now = Utc::now();
	let iat = now.timestamp() as usize;
	let exp = (now + Duration::minutes(60)).timestamp() as usize;
	let claims = Claims {
		sub: user_id.to_string(),
		exp,
		iat,
	};

	let token = encode(
		&Header::default(),
		&claims,
		// &EncodingKey::from_secret(jwt_secret.as_ref()),
		&EncodingKey::from_secret("FIXME".as_bytes()),
	)
	.map_err(|e| {
		tracing::error!("Failed to encode JWT: {:?}", e);
		APIError::InternalServerError("Failed to encode JWT".to_string())
	})?;

	Ok(token)
}

/// A function that will take a JWT token and return the user ID
#[allow(dead_code)] // TODO: Remove this once the function is used
pub(crate) fn verify_session_jwt(token: &str) -> APIResult<String> {
	let token_data = decode::<Claims>(
		token,
		// &DecodingKey::from_secret(jwt_secret.as_ref()),
		&DecodingKey::from_secret("FIXME".as_bytes()),
		&Validation::default(),
	)
	.map_err(|e| {
		tracing::error!("Failed to decode JWT: {:?}", e);
		APIError::Unauthorized
	})?;

	Ok(token_data.claims.sub)
}
