use chrono::{DateTime, Duration, FixedOffset, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use models::entity::refresh_token;
use once_cell::sync::Lazy;
use rand::distr::{Alphanumeric, SampleString};
use sea_orm::{prelude::*, ActiveValue, IntoActiveModel};
use serde::{Deserialize, Serialize};
use stump_core::config::StumpConfig;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
};

/// The secret used to sign the JWT tokens, recycles every time the server is restarted*
///
/// Note: _Technically_ it will only be initialized after the first attempt to use it, not
/// necessarily when the server starts. I don't see an issue with this, but it's worth noting.
static ACCESS_TOKEN_SECRET: Lazy<String> =
	Lazy::new(|| Alphanumeric.sample_string(&mut rand::rng(), 60));

/// The secret used to sign the refresh tokens, recycles every time the server is restarted*
static REFRESH_TOKEN_SECRET: Lazy<String> =
	Lazy::new(|| Alphanumeric.sample_string(&mut rand::rng(), 60));

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JwtTokenPair {
	pub access_token: String,
	pub refresh_token: Option<String>,
	pub expires_at: DateTime<FixedOffset>,
}

#[derive(Debug)]
struct CreatedToken {
	token: String,
	expires_at: DateTime<FixedOffset>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AccessTokenClaims {
	sub: String,
	iat: usize,
	exp: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct RefreshTokenClaims {
	sub: String,
	iat: usize,
	exp: usize,
	/// A UUID that uniquely identifies the token, stored in the database
	jti: String,
}

pub(crate) async fn create_jwt_auth(
	user_id: &str,
	state: AppState,
) -> APIResult<JwtTokenPair> {
	let CreatedToken {
		token: access_token,
		expires_at,
	} = generate_access_token(user_id, &state.config)?;

	let (
		jti,
		CreatedToken {
			token: refresh_token,
			expires_at: refresh_expiry,
		},
	) = generate_refresh_token(user_id, &state.config)?;

	let active_model = refresh_token::ActiveModel {
		id: ActiveValue::Set(jti),
		user_id: ActiveValue::Set(user_id.to_string()),
		expires_at: ActiveValue::Set(refresh_expiry),
		..Default::default()
	};
	let _ = active_model.insert(state.conn.as_ref()).await?;

	Ok(JwtTokenPair {
		access_token,
		refresh_token: Some(refresh_token),
		expires_at,
	})
}

pub(crate) fn extract_jti_from_refresh_token(token: &str) -> APIResult<String> {
	let token_data = decode::<RefreshTokenClaims>(
		token,
		&DecodingKey::from_secret(REFRESH_TOKEN_SECRET.as_bytes()),
		&Validation::default(),
	)
	.map_err(|e| {
		tracing::error!("Failed to decode refresh token JWT: {:?}", e);
		APIError::Unauthorized
	})?;

	Ok(token_data.claims.jti)
}

fn generate_access_token(user_id: &str, config: &StumpConfig) -> APIResult<CreatedToken> {
	let now = Utc::now();
	let iat = now.timestamp() as usize;
	let exp = (now + Duration::seconds(config.access_token_ttl)).timestamp() as usize;
	let expires_at = DateTime::from(now + Duration::seconds(config.access_token_ttl));
	let claims = AccessTokenClaims {
		sub: user_id.to_string(),
		exp,
		iat,
	};

	let token = encode(
		&Header::default(),
		&claims,
		&EncodingKey::from_secret(ACCESS_TOKEN_SECRET.as_bytes()),
	)
	.map_err(|e| {
		tracing::error!("Failed to encode JWT: {:?}", e);
		APIError::InternalServerError("Failed to encode JWT".to_string())
	})?;

	Ok(CreatedToken { token, expires_at })
}

fn generate_refresh_token(
	user_id: &str,
	config: &StumpConfig,
) -> APIResult<(String, CreatedToken)> {
	let now = Utc::now();
	let iat = now.timestamp() as usize;
	let exp = (now + Duration::seconds(config.refresh_token_ttl)).timestamp() as usize;
	let expires_at = DateTime::from(now + Duration::seconds(config.refresh_token_ttl));
	let jti = Uuid::new_v4().to_string();
	let claims = RefreshTokenClaims {
		sub: user_id.to_string(),
		exp,
		iat,
		jti: jti.clone(),
	};

	let token = encode(
		&Header::default(),
		&claims,
		&EncodingKey::from_secret(REFRESH_TOKEN_SECRET.as_bytes()),
	)
	.map_err(|e| {
		tracing::error!("Failed to encode refresh token JWT: {:?}", e);
		APIError::InternalServerError("Failed to encode refresh token JWT".to_string())
	})?;

	Ok((jti, CreatedToken { token, expires_at }))
}

/// A function that will take a JWT token and return the user ID
pub(crate) fn extract_user_from_jwt(token: &str) -> APIResult<String> {
	let token_data = decode::<AccessTokenClaims>(
		token,
		&DecodingKey::from_secret(ACCESS_TOKEN_SECRET.as_bytes()),
		&Validation::default(),
	)
	.map_err(|e| {
		tracing::error!("Failed to decode JWT: {:?}", e);
		APIError::Unauthorized
	})?;

	Ok(token_data.claims.sub)
}

/// Exchange a refresh token for a new access token, if the refresh token is valid
pub(crate) async fn exchange_refresh_token(
	jti: &str,
	state: AppState,
) -> APIResult<JwtTokenPair> {
	let refresh_token = refresh_token::Entity::find()
		.filter(refresh_token::Column::Id.eq(jti))
		.one(state.conn.as_ref())
		.await?
		.ok_or(APIError::Unauthorized)?;

	if refresh_token.expires_at < Utc::now() {
		let active_model = refresh_token.into_active_model();
		let _ = active_model.delete(state.conn.as_ref()).await;
		return Err(APIError::Unauthorized);
	}

	let user_id = &refresh_token.user_id;
	let jwt_pair = create_jwt_auth(user_id, state).await?;
	tracing::debug!(?user_id, "Exchanged refresh token for new JWT");

	Ok(jwt_pair)
}
