use std::sync::OnceLock;

use chrono::{DateTime, Duration, FixedOffset, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use models::entity::{refresh_token, server_config};
use sea_orm::{prelude::*, ActiveValue, IntoActiveModel, QuerySelect};
use serde::{Deserialize, Serialize};
use stump_core::config::StumpConfig;

use crate::{
	config::state::AppState,
	errors::{APIError, APIResult},
};

/// The secret used to sign the JWT tokens. If unset, will query the database
/// for the value and cache it for consecutive calls
static ACCESS_TOKEN_SECRET: OnceLock<String> = OnceLock::new();

/// The secret used to sign the JWT refresh tokens. If unset, will query the database
/// for the value and cache it for consecutive calls
static REFRESH_TOKEN_SECRET: OnceLock<String> = OnceLock::new();

async fn get_access_token_secret(conn: &DatabaseConnection) -> APIResult<String> {
	if let Some(secret) = ACCESS_TOKEN_SECRET.get() {
		return Ok(secret.clone());
	}

	let Some(Some(secret)) = server_config::Entity::find()
		.select_only()
		.column(server_config::Column::JwtAccessSecret)
		.into_tuple::<Option<String>>()
		.one(conn)
		.await?
	else {
		return Err(APIError::InternalServerError(
			"JWT access secret not set".to_string(),
		));
	};

	let _ = ACCESS_TOKEN_SECRET.set(secret.clone());
	Ok(secret)
}

async fn get_refresh_token_secret(conn: &DatabaseConnection) -> APIResult<String> {
	if let Some(secret) = REFRESH_TOKEN_SECRET.get() {
		return Ok(secret.clone());
	}

	let Some(Some(refresh_secret)) = server_config::Entity::find()
		.select_only()
		.column(server_config::Column::JwtRefreshSecret)
		.into_tuple::<Option<String>>()
		.one(conn)
		.await?
	else {
		return Err(APIError::InternalServerError(
			"JWT refresh secret not set".to_string(),
		));
	};

	let _ = REFRESH_TOKEN_SECRET.set(refresh_secret.clone());
	Ok(refresh_secret)
}

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
	conn: &DatabaseConnection,
	config: &StumpConfig,
) -> APIResult<JwtTokenPair> {
	let CreatedToken {
		token: access_token,
		expires_at,
	} = generate_access_token(user_id, config, conn).await?;

	let (
		jti,
		CreatedToken {
			token: refresh_token,
			expires_at: refresh_expiry,
		},
	) = generate_refresh_token(user_id, config, conn).await?;

	let active_model = refresh_token::ActiveModel {
		id: ActiveValue::Set(jti),
		user_id: ActiveValue::Set(user_id.to_string()),
		expires_at: ActiveValue::Set(refresh_expiry),
		..Default::default()
	};
	let _ = active_model.insert(conn).await?;

	Ok(JwtTokenPair {
		access_token,
		refresh_token: Some(refresh_token),
		expires_at,
	})
}

pub(crate) async fn extract_jti_from_refresh_token(
	token: &str,
	conn: &DatabaseConnection,
) -> APIResult<String> {
	let token_data = decode::<RefreshTokenClaims>(
		token,
		&DecodingKey::from_secret(get_refresh_token_secret(conn).await?.as_bytes()),
		&Validation::default(),
	)
	.map_err(|e| {
		tracing::error!("Failed to decode refresh token JWT: {:?}", e);
		APIError::Unauthorized
	})?;

	Ok(token_data.claims.jti)
}

async fn generate_access_token(
	user_id: &str,
	config: &StumpConfig,
	conn: &DatabaseConnection,
) -> APIResult<CreatedToken> {
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
		&EncodingKey::from_secret(get_access_token_secret(conn).await?.as_bytes()),
	)
	.map_err(|error| {
		tracing::error!(?error, "Failed to encode JWT!");
		APIError::InternalServerError("Failed to encode JWT".to_string())
	})?;

	Ok(CreatedToken { token, expires_at })
}

async fn generate_refresh_token(
	user_id: &str,
	config: &StumpConfig,
	conn: &DatabaseConnection,
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
		&EncodingKey::from_secret(get_refresh_token_secret(conn).await?.as_bytes()),
	)
	.map_err(|error| {
		tracing::error!(?error, "Failed to encode refresh token JWT!");
		APIError::InternalServerError("Failed to encode refresh token JWT".to_string())
	})?;

	Ok((jti, CreatedToken { token, expires_at }))
}

/// A function that will take a JWT token and return the user ID
pub(crate) async fn extract_user_from_jwt(
	token: &str,
	conn: &DatabaseConnection,
) -> APIResult<String> {
	let token_data = decode::<AccessTokenClaims>(
		token,
		&DecodingKey::from_secret(get_access_token_secret(conn).await?.as_bytes()),
		&Validation::default(),
	)
	.map_err(|error| {
		tracing::error!(?error, "Failed to decode JWT");
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
	let jwt_pair = create_jwt_auth(user_id, &state.conn, &state.config).await?;
	tracing::debug!(?user_id, "Exchanged refresh token for new JWT");

	Ok(jwt_pair)
}

#[cfg(test)]
mod tests {
	use ::tests::{db::test_database, fake_data};
	use models::entity::server_config;
	use sea_orm::{ActiveValue::Set, DbConn};
	use stump_core::config::StumpConfig;

	use super::*;

	// note that the once locks are static and won't reset between tests, so ordering matters here

	async fn setup_db(
		access_secret: Option<&str>,
		refresh_secret: Option<&str>,
	) -> DbConn {
		let db = test_database().await;

		server_config::ActiveModel {
			initial_wal_setup_complete: Set(false),
			jwt_access_secret: Set(access_secret.map(str::to_string)),
			jwt_refresh_secret: Set(refresh_secret.map(str::to_string)),
			..Default::default()
		}
		.insert(&db)
		.await
		.expect("Failed to insert server_config row");

		db
	}

	fn test_config() -> StumpConfig {
		StumpConfig::debug()
	}

	#[tokio::test]
	async fn test_missing_secret_returns_error() {
		let db = setup_db(None, None).await;
		let result = extract_user_from_jwt("not.a.real.token", &db).await;
		assert!(result.is_err());
	}

	#[tokio::test]
	async fn test_access_token_round_trip() {
		let db = setup_db(Some("access-secret-abc"), Some("refresh-secret-abc")).await;
		let config = test_config();
		let user = fake_data::User::new("test-user-access").insert(&db).await;

		let pair = create_jwt_auth(&user.id, &db, &config)
			.await
			.expect("Failed to create JWT pair");

		let user_id = extract_user_from_jwt(&pair.access_token, &db)
			.await
			.expect("Failed to extract user from access token");

		assert_eq!(user_id, user.id);
	}

	#[tokio::test]
	async fn test_refresh_token_jti_extraction() {
		let db = setup_db(Some("access-secret-abc"), Some("refresh-secret-abc")).await;
		let config = test_config();
		let user = fake_data::User::new("test-user-refresh").insert(&db).await;

		let pair = create_jwt_auth(&user.id, &db, &config)
			.await
			.expect("Failed to create JWT pair");

		let refresh_token_str = pair.refresh_token.expect("Expected a refresh token");
		let jti = extract_jti_from_refresh_token(&refresh_token_str, &db)
			.await
			.expect("Failed to extract jti from refresh token");

		assert!(!jti.is_empty());
	}

	#[tokio::test]
	async fn test_secrets_cached_after_first_retrieval() {
		let db = setup_db(Some("access-secret-abc"), Some("refresh-secret-abc")).await;
		let config = test_config();
		let user = fake_data::User::new("test-user-cached").insert(&db).await;

		create_jwt_auth(&user.id, &db, &config)
			.await
			.expect("Failed to create JWT pair");

		assert!(
			ACCESS_TOKEN_SECRET.get().is_some(),
			"ACCESS_TOKEN_SECRET should be cached after first use"
		);
		assert!(
			REFRESH_TOKEN_SECRET.get().is_some(),
			"REFRESH_TOKEN_SECRET should be cached after first use"
		);
	}

	#[tokio::test]
	async fn test_extract_user_from_invalid_token() {
		let db = setup_db(Some("access-secret-abc"), Some("refresh-secret-abc")).await;

		let result = extract_user_from_jwt("this.is.garbage", &db).await;

		assert!(
			matches!(result, Err(APIError::Unauthorized)),
			"Expected Unauthorized for a malformed token, got: {result:?}"
		);
	}
}
